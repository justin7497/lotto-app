import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ensureAuthTokenReady, getAuthUserId } from "@/utils/authReady";
import {
  loadPrintDoneKeys,
  printDoneKey,
  savePrintDoneKeys,
} from "@/utils/printDone";
import type { SlipPickMode } from "@/utils/mobileSlip";
import { getRoundTag } from "@/utils/savedNumbers";

const STORAGE_KEY = "lotto_favorite_picks_v1";
const LEGACY_ROUND_TAG = "회차 미기록";

type UserIdGetter = () => string | null;
let userIdGetter: UserIdGetter | null = null;

const invalidateListeners = new Set<() => void>();

export function setFavoritePicksUserIdGetter(getter: UserIdGetter | null): void {
  userIdGetter = getter;
}

export function onFavoritePicksInvalidate(listener: () => void): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}

export function notifyFavoritePicksInvalidate(): void {
  for (const listener of invalidateListeners) listener();
}

export interface FavoritePick {
  id: string;
  name: string;
  numbers: number[];
  savedAt: string;
  mode?: SlipPickMode;
  /** 저장 당시 대상 회차 */
  roundTag?: string;
  /** 판매점 출력 완료 */
  printDone?: boolean;
}

export const FAVORITE_LEGACY_ROUND_TAG = LEGACY_ROUND_TAG;

function getCurrentUserId(): string | null {
  const direct = getAuthUserId();
  if (direct) return direct;
  if (!userIdGetter) return null;
  try {
    return userIdGetter();
  } catch {
    return null;
  }
}

function favoritePicksCollection(uid: string) {
  if (!db) throw new Error("Firestore is not configured");
  return collection(db, "users", uid, "favoritePicks");
}

function inferMode(numbers: number[], mode?: SlipPickMode): SlipPickMode {
  if (mode === "A" || mode === "M") return mode;
  return numbers.length === 0 ? "A" : "M";
}

function isValidPick(row: FavoritePick): boolean {
  const numbers = (Array.isArray(row.numbers) ? row.numbers : [])
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
  if (new Set(numbers).size !== numbers.length) return false;
  const mode = inferMode(numbers, row.mode);
  if (mode === "A") return numbers.length === 0;
  return numbers.length >= 1 && numbers.length <= 6;
}

function normalizePick(row: FavoritePick): FavoritePick | null {
  const numbers = (Array.isArray(row.numbers) ? row.numbers : [])
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45)
    .sort((a, b) => a - b);
  const mode = inferMode(numbers, row.mode);
  const pick: FavoritePick = {
    id: String(row.id),
    name: String(row.name ?? ""),
    numbers: mode === "A" ? [] : numbers,
    mode,
    savedAt: row.savedAt || new Date().toISOString(),
    roundTag: row.roundTag,
    printDone: row.printDone ? true : undefined,
  };
  return isValidPick(pick) ? pick : null;
}

function mergeFavoritePicks(...lists: FavoritePick[][]): FavoritePick[] {
  const byId = new Map<string, FavoritePick>();
  for (const list of lists) {
    for (const row of list) {
      const normalized = normalizePick(row);
      if (!normalized) continue;
      const existing = byId.get(normalized.id);
      if (!existing || normalized.savedAt.localeCompare(existing.savedAt) > 0) {
        byId.set(normalized.id, normalized);
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function readLocal(): FavoritePick[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as FavoritePick[];
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) => {
      const pick = normalizePick(row);
      return pick ? [pick] : [];
    });
  } catch {
    return [];
  }
}

function writeLocal(rows: FavoritePick[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function removeLocalIds(ids: Set<string>): void {
  if (ids.size === 0) return;
  writeLocal(readLocal().filter((p) => !ids.has(p.id)));
}

async function loadFromFirestore(uid: string): Promise<FavoritePick[]> {
  if (!db) return [];
  const mapDocs = (docs: { data: () => unknown }[]) =>
    docs
      .flatMap((d) => {
        const pick = normalizePick(d.data() as FavoritePick);
        return pick ? [pick] : [];
      })
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  try {
    const snap = await getDocs(
      query(favoritePicksCollection(uid), orderBy("savedAt", "desc")),
    );
    return mapDocs(snap.docs);
  } catch {
    try {
      const snap = await getDocs(favoritePicksCollection(uid));
      return mapDocs(snap.docs);
    } catch {
      return [];
    }
  }
}

async function saveToFirestore(uid: string, pick: FavoritePick): Promise<boolean> {
  if (!db) return false;
  try {
    const docData: Record<string, unknown> = {
      id: pick.id,
      name: pick.name,
      numbers: pick.numbers,
      mode: pick.mode ?? inferMode(pick.numbers),
      savedAt: pick.savedAt,
      roundTag: pick.roundTag ?? null,
    };
    if (pick.printDone) docData.printDone = true;
    await setDoc(doc(favoritePicksCollection(uid), pick.id), docData);
    return true;
  } catch {
    return false;
  }
}

function applyPrintDoneFromPicks(picks: FavoritePick[]): void {
  const keys = loadPrintDoneKeys();
  const merged = new Set(keys);
  for (const pick of picks) {
    if (pick.printDone) merged.add(printDoneKey(pick.id));
  }
  if (merged.size === keys.size && [...merged].every((k) => keys.has(k))) return;
  savePrintDoneKeys(merged);
}

async function deleteFromFirestore(uid: string, id: string): Promise<boolean> {
  if (!db) return false;
  try {
    await deleteDoc(doc(favoritePicksCollection(uid), id));
    return true;
  } catch {
    return false;
  }
}

async function syncLocalToFirestore(uid: string): Promise<void> {
  const local = readLocal();
  if (local.length === 0) return;

  const syncedIds = new Set<string>();
  for (const pick of local) {
    if (await saveToFirestore(uid, pick)) syncedIds.add(pick.id);
  }
  if (syncedIds.size > 0) removeLocalIds(syncedIds);
}

export async function loadFavoritePicks(): Promise<FavoritePick[]> {
  const local = readLocal();
  const uid = getCurrentUserId();

  if (!uid || !isFirebaseConfigured) {
    return mergeFavoritePicks(local);
  }

  if (!(await ensureAuthTokenReady())) {
    return mergeFavoritePicks(local);
  }

  await syncLocalToFirestore(uid);
  const remote = await loadFromFirestore(uid);
  const merged = mergeFavoritePicks(remote, readLocal());
  applyPrintDoneFromPicks(merged);
  return merged;
}

export async function saveFavoritePick(
  name: string,
  numbers: number[],
  mode?: SlipPickMode,
  roundTag?: string,
): Promise<FavoritePick | null> {
  const pickMode = mode ?? (numbers.length === 0 ? "A" : "M");
  const sorted =
    pickMode === "A"
      ? []
      : [...numbers].sort((a, b) => a - b);

  if (pickMode === "A") {
    if (numbers.length !== 0) return null;
  } else if (sorted.length < 1 || sorted.length > 6) {
    return null;
  } else if (new Set(sorted).size !== sorted.length || sorted.some((n) => n < 1 || n > 45)) {
    return null;
  }

  const existing = await loadFavoritePicks();

  const pick: FavoritePick = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `단골 ${existing.length + 1}`,
    numbers: sorted,
    mode: pickMode,
    savedAt: new Date().toISOString(),
    roundTag: roundTag ?? getRoundTag(),
  };

  const uid = getCurrentUserId();
  writeLocal(mergeFavoritePicks([pick], readLocal()));

  if (uid && isFirebaseConfigured) {
    const saved = await saveToFirestore(uid, pick);
    if (saved) removeLocalIds(new Set([pick.id]));
  }

  notifyFavoritePicksInvalidate();
  return pick;
}

export async function updateFavoritePick(
  id: string,
  name: string,
  numbers: number[],
  mode?: SlipPickMode,
): Promise<boolean> {
  const pickMode = mode ?? (numbers.length === 0 ? "A" : "M");
  const sorted =
    pickMode === "A"
      ? []
      : [...numbers].sort((a, b) => a - b);

  if (pickMode === "A") {
    if (numbers.length !== 0) return false;
  } else if (
    sorted.length < 1 ||
    sorted.length > 6 ||
    new Set(sorted).size !== sorted.length ||
    sorted.some((n) => n < 1 || n > 45)
  ) {
    return false;
  }

  const rows = await loadFavoritePicks();
  const idx = rows.findIndex((p) => p.id === id);
  if (idx < 0) return false;

  const updated: FavoritePick = {
    ...rows[idx],
    name: name.trim() || rows[idx].name,
    numbers: sorted,
    mode: pickMode,
    savedAt: new Date().toISOString(),
  };

  const uid = getCurrentUserId();
  const next = [...rows];
  next[idx] = updated;
  writeLocal(mergeFavoritePicks(next));

  if (uid && isFirebaseConfigured) {
    const saved = await saveToFirestore(uid, updated);
    if (saved) removeLocalIds(new Set([updated.id]));
  }

  notifyFavoritePicksInvalidate();
  return true;
}

export async function deleteFavoritePick(id: string): Promise<void> {
  const uid = getCurrentUserId();
  if (uid && isFirebaseConfigured) {
    await deleteFromFirestore(uid, id);
  }
  writeLocal(readLocal().filter((p) => p.id !== id));
  notifyFavoritePicksInvalidate();
}

export async function clearAllFavoritePicks(): Promise<void> {
  const uid = getCurrentUserId();
  const picks = await loadFavoritePicks();
  if (uid && isFirebaseConfigured) {
    for (const pick of picks) {
      await deleteFromFirestore(uid, pick.id);
    }
  }
  writeLocal([]);
  notifyFavoritePicksInvalidate();
}

export function favoritePickToSlipGame(pick: FavoritePick) {
  return {
    numbers: [...pick.numbers],
    mode: pick.mode ?? inferMode(pick.numbers, pick.mode),
  };
}

export async function setFavoritePickPrintDone(pickId: string, done: boolean): Promise<void> {
  const uid = getCurrentUserId();
  const local = readLocal();
  const idx = local.findIndex((p) => p.id === pickId);
  if (idx >= 0) {
    const updated = { ...local[idx], printDone: done || undefined };
    const next = [...local];
    next[idx] = updated;
    writeLocal(next);
  }

  if (uid && isFirebaseConfigured && db) {
    try {
      await setDoc(
        doc(favoritePicksCollection(uid), pickId),
        { printDone: done },
        { merge: true },
      );
    } catch {
      /* ignore */
    }
  }
}
