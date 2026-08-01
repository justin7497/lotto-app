import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { GeneratedNumbers, GeneratorMode, LottoRound } from "@/data/types";
import { db, isFirebaseConfigured } from "@/lib/firebase";

const MIGRATION_KEY = "lotto_migrated_firestore_v1";
const LEGACY_KEY = "lotto_saved_numbers";
const LOCAL_KEY = "lotto_saved_sets_v4";

type UserIdGetter = () => string | null;
let userIdGetter: UserIdGetter | null = null;
const invalidateListeners = new Set<() => void>();

export function setSavedNumbersUserIdGetter(getter: UserIdGetter | null): void {
  userIdGetter = getter;
}

export function onSavedSetsInvalidate(listener: () => void): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}

export function notifySavedSetsInvalidate(): void {
  for (const listener of invalidateListeners) listener();
}

export type SaveNumberSetsResult =
  | { ok: true; set: SavedSet }
  | { ok: false; set: SavedSet; error: string };

export interface SavedSet {
  id: string;
  sets: GeneratedNumbers[];
  mode: GeneratorMode;
  savedAt: string;
  roundTag: string;
  subLabel?: string | null;
}

export interface WinResult {
  matchCount: number;
  bonusMatch: boolean;
  rank: 1 | 2 | 3 | 4 | 5 | null;
  label: string;
}

function getCurrentUserId(): string | null {
  if (!userIdGetter) return null;
  try {
    return userIdGetter();
  } catch {
    return null;
  }
}

function savedSetsCollection(uid: string) {
  if (!db) throw new Error("Firestore is not configured");
  return collection(db, "users", uid, "savedNumbers");
}

function getNextRoundInfo(): { roundNo: number; drawDate: string } {
  const BASE_ROUND = 1221;
  const KST = 9 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const BASE_KST_DAY = new Date("2026-04-25T00:00:00+09:00").getTime();

  const nowKST = Date.now() + KST;
  const todayKSTDay = Math.floor(nowKST / ONE_DAY) * ONE_DAY - KST;
  const diffDays = Math.round((todayKSTDay - BASE_KST_DAY) / ONE_DAY);
  const weeksSince = diffDays <= 0 ? 0 : Math.ceil(diffDays / 7);

  const roundNo = BASE_ROUND + weeksSince;
  const drawDateUTC = new Date(BASE_KST_DAY + weeksSince * 7 * ONE_DAY + KST);
  const drawDate = `${drawDateUTC.getUTCFullYear()}.${String(drawDateUTC.getUTCMonth() + 1).padStart(2, "0")}.${String(drawDateUTC.getUTCDate()).padStart(2, "0")}`;
  return { roundNo, drawDate };
}

export function getRoundTag(): string {
  const { roundNo, drawDate } = getNextRoundInfo();
  return `제${roundNo}회 (${drawDate})`;
}

function toIsoSavedAt(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function normalizeSavedSet(row: SavedSet & { saved_at?: string }): SavedSet {
  const savedAt = toIsoSavedAt(row.savedAt ?? row.saved_at);
  return { ...row, savedAt };
}

/** Firestore는 undefined 필드를 거부하므로 저장용으로만 직렬화 */
function sanitizeGame(game: GeneratedNumbers): GeneratedNumbers {
  const numbers = (Array.isArray(game.numbers) ? game.numbers : [])
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45)
    .slice(0, 6) as GeneratedNumbers["numbers"];

  const out: GeneratedNumbers = {
    numbers,
    mode: game.mode ?? "random",
  };
  if (typeof game.bonus === "number") out.bonus = game.bonus;
  if (typeof game.acValue === "number") out.acValue = game.acValue;
  if (typeof game.score === "number") out.score = game.score;
  if (typeof game.summary === "string") out.summary = game.summary;
  if (game.lottokingDetail) out.lottokingDetail = game.lottokingDetail;
  return out;
}

function sanitizeSavedSet(set: SavedSet): SavedSet {
  const sets = (Array.isArray(set.sets) ? set.sets : [])
    .map(sanitizeGame)
    .filter((g) => g.numbers.length === 6);

  return {
    id: String(set.id),
    sets,
    mode: set.mode ?? sets[0]?.mode ?? "random",
    savedAt: toIsoSavedAt(set.savedAt),
    roundTag: String(set.roundTag ?? ""),
    subLabel: set.subLabel ?? null,
  };
}

function mergeSavedSets(...groups: SavedSet[][]): SavedSet[] {
  const byId = new Map<string, SavedSet>();
  for (const group of groups) {
    for (const row of group) {
      if (!row?.id || !Array.isArray(row.sets) || row.sets.length === 0) continue;
      byId.set(row.id, sanitizeSavedSet(normalizeSavedSet(row)));
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

function readLocalKey(key: string): SavedSet[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const rows = JSON.parse(raw) as SavedSet[];
    return Array.isArray(rows)
      ? rows.map((row) => sanitizeSavedSet(normalizeSavedSet(row)))
      : [];
  } catch {
    return [];
  }
}

function loadLocalSavedSets(): SavedSet[] {
  return mergeSavedSets(readLocalKey(LOCAL_KEY), readLocalKey(LEGACY_KEY));
}

function saveLocalSavedSets(rows: SavedSet[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function appendLocalSavedSet(set: SavedSet): void {
  saveLocalSavedSets(mergeSavedSets([set], loadLocalSavedSets()));
}

function removeLocalSavedSetIds(ids: Set<string>): void {
  if (ids.size === 0) return;
  saveLocalSavedSets(loadLocalSavedSets().filter((s) => !ids.has(s.id)));
}

function toFirestoreDoc(set: SavedSet) {
  const clean = sanitizeSavedSet(set);
  return {
    id: clean.id,
    sets: clean.sets,
    mode: clean.mode,
    savedAt: clean.savedAt,
    roundTag: clean.roundTag,
    subLabel: clean.subLabel ?? null,
  };
}

async function loadFromFirestore(uid: string): Promise<SavedSet[]> {
  if (!db) return [];
  const mapDocs = (docs: { data: () => unknown }[]) =>
    docs
      .map((d) => sanitizeSavedSet(normalizeSavedSet(d.data() as SavedSet)))
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  try {
    const snap = await getDocs(
      query(savedSetsCollection(uid), orderBy("savedAt", "desc")),
    );
    return mapDocs(snap.docs);
  } catch {
    try {
      const snap = await getDocs(savedSetsCollection(uid));
      return mapDocs(snap.docs);
    } catch {
      return [];
    }
  }
}

async function saveToFirestore(uid: string, set: SavedSet): Promise<boolean> {
  if (!db) return false;
  try {
    await setDoc(doc(savedSetsCollection(uid), set.id), toFirestoreDoc(set));
    return true;
  } catch {
    return false;
  }
}

async function deleteFromFirestore(uid: string, id: string): Promise<boolean> {
  if (!db) return false;
  try {
    await deleteDoc(doc(savedSetsCollection(uid), id));
    return true;
  } catch {
    return false;
  }
}

async function clearFirestore(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDocs(savedSetsCollection(uid));
    if (snap.empty) return true;
    const batch = writeBatch(db);
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    return true;
  } catch {
    return false;
  }
}

async function syncLocalToFirestore(uid: string): Promise<void> {
  const local = loadLocalSavedSets();
  if (local.length === 0) return;

  const syncedIds = new Set<string>();
  for (const set of local) {
    if (await saveToFirestore(uid, set)) syncedIds.add(set.id);
  }
  if (syncedIds.size > 0) removeLocalSavedSetIds(syncedIds);
}

async function importLegacyLocalOnce(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return;
    const legacy = readLocalKey(LEGACY_KEY);
    if (legacy.length > 0) {
      saveLocalSavedSets(mergeSavedSets(legacy, loadLocalSavedSets()));
      localStorage.removeItem(LEGACY_KEY);
    }
    localStorage.setItem(MIGRATION_KEY, "1");
  } catch {
    localStorage.setItem(MIGRATION_KEY, "1");
  }
}

export async function loadSavedSets(): Promise<SavedSet[]> {
  await importLegacyLocalOnce();

  const uid = getCurrentUserId();
  const local = loadLocalSavedSets();

  if (!uid || !isFirebaseConfigured) {
    return local;
  }

  await syncLocalToFirestore(uid);

  const remote = await loadFromFirestore(uid);
  return mergeSavedSets(remote, loadLocalSavedSets());
}

export async function saveNumberSets(
  sets: GeneratedNumbers[],
  subLabel?: string,
): Promise<SaveNumberSetsResult> {
  if (sets.length === 0) {
    return {
      ok: false,
      set: {
        id: "",
        sets: [],
        mode: "random",
        savedAt: new Date().toISOString(),
        roundTag: getRoundTag(),
      },
      error: "저장할 번호가 없습니다.",
    };
  }

  const newSet = sanitizeSavedSet({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sets,
    mode: sets[0]?.mode ?? "random",
    savedAt: new Date().toISOString(),
    roundTag: getRoundTag(),
    subLabel: subLabel ?? null,
  });

  const uid = getCurrentUserId();
  appendLocalSavedSet(newSet);

  if (uid && isFirebaseConfigured) {
    const saved = await saveToFirestore(uid, newSet);
    if (saved) {
      removeLocalSavedSetIds(new Set([newSet.id]));
      notifySavedSetsInvalidate();
      return { ok: true, set: newSet };
    }
    notifySavedSetsInvalidate();
    return {
      ok: false,
      set: newSet,
      error: "Firebase 저장에 실패했습니다. 이 기기에는 저장됐습니다.",
    };
  }

  notifySavedSetsInvalidate();
  return { ok: true, set: newSet };
}

export async function deleteNumberSet(id: string): Promise<void> {
  const uid = getCurrentUserId();
  if (uid && isFirebaseConfigured) {
    await deleteFromFirestore(uid, id);
  }
  removeLocalSavedSetIds(new Set([id]));
  notifySavedSetsInvalidate();
}

export async function clearAllSavedSets(): Promise<void> {
  const uid = getCurrentUserId();
  if (uid && isFirebaseConfigured) {
    await clearFirestore(uid);
  }
  saveLocalSavedSets([]);
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  notifySavedSetsInvalidate();
}

export async function isDuplicateNumberSets(
  sets: GeneratedNumbers[],
  existing: SavedSet[],
): Promise<boolean> {
  const incomingKey = sets
    .map((s) => [...s.numbers].sort((a, b) => a - b).join(","))
    .sort()
    .join("|");
  return existing.some((saved) => {
    const savedKey = saved.sets
      .map((s) => [...s.numbers].sort((a, b) => a - b).join(","))
      .sort()
      .join("|");
    return savedKey === incomingKey;
  });
}

export function parseRoundNo(roundTag: string): number | null {
  const match = roundTag.match(/제(\d+)회/);
  return match ? parseInt(match[1], 10) : null;
}

export function checkWinResult(numbers: number[], round: LottoRound): WinResult {
  const winning = [
    round.drwtNo1, round.drwtNo2, round.drwtNo3,
    round.drwtNo4, round.drwtNo5, round.drwtNo6,
  ];
  const matchCount = numbers.filter((n) => winning.includes(n)).length;
  const bonusMatch = numbers.includes(round.bnusNo);

  let rank: WinResult["rank"] = null;
  let label = "";

  if (matchCount === 6) { rank = 1; label = "6개 일치 🎉 1등"; }
  else if (matchCount === 5 && bonusMatch) { rank = 2; label = "5+보너스 일치 ✨ 2등"; }
  else if (matchCount === 5) { rank = 3; label = "5개 일치 🥳 3등"; }
  else if (matchCount === 4) { rank = 4; label = "4개 일치 4등"; }
  else if (matchCount === 3) { rank = 5; label = "3개 일치 5등"; }
  else { label = `${matchCount}개 일치 낙첨`; }

  return { matchCount, bonusMatch, rank, label };
}
