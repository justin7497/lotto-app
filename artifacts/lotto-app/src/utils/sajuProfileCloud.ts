import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  loadSajuInput,
  saveSajuInput,
  type SajuInput,
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

export async function loadSajuProfileCloud(uid: string): Promise<{
  input: SajuInput;
  updatedAt: string;
} | null> {
  if (!isFirebaseConfigured || !db) return null;
  const snap = await getDoc(settingsRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const input = parseCloudInput(data);
  if (!input) return null;
  const updatedAt =
    typeof data.updatedAt === "string" ? data.updatedAt : new Date(0).toISOString();
  return { input, updatedAt };
}

export async function saveSajuProfileCloud(uid: string, input: SajuInput): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(settingsRef(uid), {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

function readLocalUpdatedAt(): string | null {
  try {
    const raw = localStorage.getItem("lotto_saju_profile_v2");
    if (!raw) return null;
    const data = JSON.parse(raw) as { updatedAt?: string };
    return typeof data.updatedAt === "string" ? data.updatedAt : null;
  } catch {
    return null;
  }
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
      saveSajuInput(cloud.input);
    } else {
      await saveSajuProfileCloud(uid, local);
    }
  } else if (cloud) {
    saveSajuInput(cloud.input);
  } else if (local) {
    await saveSajuProfileCloud(uid, local);
  }

  notifySajuInputInvalidate();
}
