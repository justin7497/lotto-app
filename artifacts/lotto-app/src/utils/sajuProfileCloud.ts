import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  getActiveSajuPerson,
  getSajuPeopleUpdatedAt,
  loadSajuInput,
  loadSajuPeopleState,
  parseSajuPeopleState,
  replaceSajuPeopleState,
  saveSajuInput,
  type SajuInput,
  type SajuPeopleState,
} from "@/utils/sajuLucky";

const SETTINGS_DOC_ID = "sajuProfile";

const invalidateListeners = new Set<() => void>();

export function onSajuInputInvalidate(listener: () => void): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}

export function notifySajuInputInvalidate(): void {
  for (const listener of invalidateListeners) listener();
}

function settingsRef(uid: string) {
  if (!db) throw new Error("Firestore is not configured");
  return doc(db, "users", uid, "settings", SETTINGS_DOC_ID);
}

function parseCloudInput(raw: unknown): SajuInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const year = Number(data.year);
  const month = Number(data.month);
  const day = Number(data.day);
  const hour = Number(data.hour);
  const minute = Number(data.minute);
  const bloodType = data.bloodType;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (bloodType !== "A" && bloodType !== "B" && bloodType !== "O" && bloodType !== "AB") return null;
  return {
    year,
    month,
    day,
    hour: Math.min(23, Math.max(0, Math.floor(hour))),
    minute: Math.min(59, Math.max(0, Math.floor(minute))),
    bloodType,
  };
}

function parseCloudPeople(data: Record<string, unknown>): SajuPeopleState | null {
  const fromList = parseSajuPeopleState(data);
  if (fromList) return fromList;
  const input = parseCloudInput(data);
  if (!input) return null;
  const id = "saju_self";
  return {
    activeId: id,
    people: [
      {
        ...input,
        id,
        name: "나",
        updatedAt:
          typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
      },
    ],
  };
}

export async function loadSajuProfileCloud(uid: string): Promise<{
  input: SajuInput;
  people: SajuPeopleState;
  updatedAt: string;
} | null> {
  if (!isFirebaseConfigured || !db) return null;
  const snap = await getDoc(settingsRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const people = parseCloudPeople(data);
  if (!people) return null;
  const active = people.people.find((p) => p.id === people.activeId) ?? people.people[0];
  const updatedAt =
    typeof data.updatedAt === "string" ? data.updatedAt : active.updatedAt;
  return {
    input: {
      year: active.year,
      month: active.month,
      day: active.day,
      hour: active.hour,
      minute: active.minute,
      bloodType: active.bloodType,
    },
    people,
    updatedAt,
  };
}

export async function saveSajuProfileCloud(uid: string, input: SajuInput): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const people = loadSajuPeopleState();
  const active = getActiveSajuPerson(people);
  await setDoc(settingsRef(uid), {
    ...input,
    name: active.name,
    activeId: people.activeId,
    people: people.people,
    updatedAt: new Date().toISOString(),
  });
}

function readLocalUpdatedAt(): string | null {
  return getSajuPeopleUpdatedAt();
}

/** 로그인 시 클라우드 ↔ 로컬 병합 후 로컬에 반영 */
export async function syncSajuProfileCloud(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const local = loadSajuInput();
  const localUpdatedAt = readLocalUpdatedAt();
  const cloud = await loadSajuProfileCloud(uid);

  if (cloud && local) {
    const cloudTime = Date.parse(cloud.updatedAt);
    const localTime = localUpdatedAt ? Date.parse(localUpdatedAt) : 0;
    if (cloudTime >= localTime) {
      replaceSajuPeopleState(cloud.people);
    } else {
      await saveSajuProfileCloud(uid, local);
    }
  } else if (cloud) {
    replaceSajuPeopleState(cloud.people);
  } else if (local) {
    await saveSajuProfileCloud(uid, local);
  }

  notifySajuInputInvalidate();
}
