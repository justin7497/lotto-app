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
import {
  loadPrintDoneKeys,
  printDoneKey,
  savePrintDoneKeys,
} from "@/utils/printDone";
import type { GeneratedNumbers, GeneratorMode, LottoRound } from "@/data/types";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ensureAuthTokenReady, getAuthUserId } from "@/utils/authReady";

const MIGRATION_KEY = "lotto_migrated_firestore_v1";
const LEGACY_KEY = "lotto_saved_numbers";
const LOCAL_KEY = "lotto_saved_sets_v4";
const ARCHIVE_KEY = "lotto_saved_sets_archive_v1";

export type SavedSetMutationResult =
  | { ok: true }
  | { ok: false; error: string };

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
  /** 판매점 출력 완료 — 클라우드 동기화용 */
  printDone?: boolean;
}

export interface WinResult {
  matchCount: number;
  bonusMatch: boolean;
  rank: 1 | 2 | 3 | 4 | 5 | null;
  label: string;
}

export interface UserNumberHitState {
  matched: boolean;
  isBonusHit: boolean;
}

/** 사용자 번호 1개의 일치 여부 — 보너스는 2등(5개+보너스)일 때만 일치 처리 */
export function getUserNumberHitState(
  number: number,
  numbers: number[],
  round: LottoRound,
): UserNumberHitState {
  const winning = [
    round.drwtNo1,
    round.drwtNo2,
    round.drwtNo3,
    round.drwtNo4,
    round.drwtNo5,
    round.drwtNo6,
  ];
  const matchCount = numbers.filter((n) => winning.includes(n)).length;

  if (winning.includes(number)) {
    return { matched: true, isBonusHit: false };
  }
  if (number === round.bnusNo && matchCount === 5) {
    return { matched: true, isBonusHit: true };
  }
  return { matched: false, isBonusHit: false };
}

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

function savedSetsCollection(uid: string) {
  if (!db) throw new Error("Firestore is not configured");
  return collection(db, "users", uid, "savedNumbers");
}

export function getCurrentPurchaseRoundNo(): number {
  return getNextRoundInfo().roundNo;
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
  return { ...row, savedAt, printDone: Boolean(row.printDone) || undefined };
}

/** Firestore는 undefined 필드를 거부하므로 저장용으로만 직렬화 */
function isImportPickGame(game: GeneratedNumbers): boolean {
  return game.slipPickMode === "A" || game.slipPickMode === "M";
}

function sanitizeGame(game: GeneratedNumbers): GeneratedNumbers | null {
  const pickMode = game.slipPickMode;
  const numbers = (Array.isArray(game.numbers) ? game.numbers : [])
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45)
    .sort((a, b) => a - b);

  if (new Set(numbers).size !== numbers.length) return null;

  if (pickMode === "A") {
    if (numbers.length !== 0) return null;
  } else if (pickMode === "M") {
    if (numbers.length < 1 || numbers.length > 6) return null;
  } else if (numbers.length !== 6) {
    return null;
  }

  const out: GeneratedNumbers = {
    numbers: numbers as GeneratedNumbers["numbers"],
    mode: game.mode ?? "random",
  };
  if (pickMode) out.slipPickMode = pickMode;
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
    .filter((g): g is GeneratedNumbers => g !== null);

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

function loadArchivedSavedSets(): SavedSet[] {
  return readLocalKey(ARCHIVE_KEY);
}

function saveArchivedSavedSets(rows: SavedSet[]): void {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(mergeSavedSets(rows)));
  } catch {
    /* ignore */
  }
}

function archiveSavedSets(rows: SavedSet[]): void {
  if (rows.length === 0) return;
  saveArchivedSavedSets(mergeSavedSets(rows, loadArchivedSavedSets()));
}

function collectRestorableSavedSets(remote: SavedSet[]): SavedSet[] {
  return mergeSavedSets(
    remote,
    loadLocalSavedSets(),
    readLocalKey(LEGACY_KEY),
    loadArchivedSavedSets(),
  );
}

async function restoreMissingSavedSetsToFirestore(uid: string): Promise<number> {
  const remote = await loadFromFirestore(uid);
  const candidates = collectRestorableSavedSets(remote);
  archiveSavedSets(candidates);

  const remoteIds = new Set(remote.map((row) => row.id));
  let restored = 0;
  for (const set of candidates) {
    if (remoteIds.has(set.id)) continue;
    if (await saveToFirestore(uid, set)) restored += 1;
  }
  return restored;
}

export function canDeleteSavedNumbers(): boolean {
  return !(getCurrentUserId() && isFirebaseConfigured);
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
  const doc: Record<string, unknown> = {
    id: clean.id,
    sets: clean.sets,
    mode: clean.mode,
    savedAt: clean.savedAt,
    roundTag: clean.roundTag,
    subLabel: clean.subLabel ?? null,
  };
  if (clean.printDone) doc.printDone = true;
  return doc;
}

function applyPrintDoneFromSets(sets: SavedSet[]): void {
  const keys = loadPrintDoneKeys();
  const merged = new Set(keys);
  for (const set of sets) {
    if (set.printDone) merged.add(printDoneKey(set.id));
  }
  if (merged.size === keys.size && [...merged].every((k) => keys.has(k))) return;
  savePrintDoneKeys(merged);
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

  if (!(await ensureAuthTokenReady())) {
    return mergeSavedSets(local, loadArchivedSavedSets());
  }

  await syncLocalToFirestore(uid);

  const remote = await loadFromFirestore(uid);
  const restored = await restoreMissingSavedSetsToFirestore(uid);
  const mergedRemote = restored > 0 ? await loadFromFirestore(uid) : remote;
  const merged = mergeSavedSets(mergedRemote, loadLocalSavedSets(), loadArchivedSavedSets());
  applyPrintDoneFromSets(merged);
  return merged;
}

/** 로그인 사용자: 로컬·아카이브에 남아 있는 지난 회차 번호를 Firestore로 복구 */
export async function restoreSavedSetsFromArchive(): Promise<number> {
  const uid = getCurrentUserId();
  if (!uid || !isFirebaseConfigured) return 0;
  if (!(await ensureAuthTokenReady())) return 0;
  const restored = await restoreMissingSavedSetsToFirestore(uid);
  if (restored > 0) notifySavedSetsInvalidate();
  return restored;
}

export async function saveNumberSets(
  sets: GeneratedNumbers[],
  subLabel?: string,
  roundTagOverride?: string,
): Promise<SaveNumberSetsResult> {
  const existing = await loadSavedSets();
  const importBatch = sets.some(isImportPickGame);
  const prepared = importBatch ? sets : dedupeGeneratedNumberSets(sets);
  const uniqueSets = importBatch ? prepared : excludeSameWeekSaved(prepared, existing);
  if (uniqueSets.length === 0) {
    return {
      ok: false,
      set: {
        id: "",
        sets: [],
        mode: "random",
        savedAt: new Date().toISOString(),
        roundTag: roundTagOverride ?? getRoundTag(),
      },
      error: importBatch ? "저장할 번호가 없습니다." : "이번 주에 이미 저장한 번호입니다.",
    };
  }

  const newSet = sanitizeSavedSet({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sets: uniqueSets,
    mode: uniqueSets[0]?.mode ?? "random",
    savedAt: new Date().toISOString(),
    roundTag: roundTagOverride ?? getRoundTag(),
    subLabel: subLabel ?? null,
  });

  const uid = getCurrentUserId();
  appendLocalSavedSet(newSet);
  archiveSavedSets([newSet]);

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
      error: "Firebase 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  notifySavedSetsInvalidate();
  return { ok: true, set: newSet };
}

export async function deleteNumberSet(id: string): Promise<SavedSetMutationResult> {
  if (!canDeleteSavedNumbers()) {
    return {
      ok: false,
      error: "로그인한 계정의 저장번호는 삭제할 수 없습니다.",
    };
  }

  const uid = getCurrentUserId();
  if (uid && isFirebaseConfigured) {
    await deleteFromFirestore(uid, id);
  }
  removeLocalSavedSetIds(new Set([id]));
  notifySavedSetsInvalidate();
  return { ok: true };
}

function replaceLocalSavedSet(set: SavedSet): void {
  const all = loadLocalSavedSets();
  const index = all.findIndex((row) => row.id === set.id);
  if (index >= 0) all[index] = set;
  else all.push(set);
  saveLocalSavedSets(all);
}

export async function removeGameFromSavedSet(
  savedSetId: string,
  gameIndex: number,
): Promise<SavedSetMutationResult> {
  if (!canDeleteSavedNumbers()) {
    return {
      ok: false,
      error: "로그인한 계정의 저장번호는 삭제할 수 없습니다.",
    };
  }

  const all = await loadSavedSets();
  const saved = all.find((row) => row.id === savedSetId);
  if (!saved) return { ok: false, error: "번호를 찾을 수 없습니다." };
  if (gameIndex < 0 || gameIndex >= saved.sets.length) {
    return { ok: false, error: "번호를 찾을 수 없습니다." };
  }
  if (saved.sets.length <= 1) return deleteNumberSet(savedSetId);

  const updated = sanitizeSavedSet({
    ...saved,
    sets: saved.sets.filter((_, index) => index !== gameIndex),
  });

  replaceLocalSavedSet(updated);
  const uid = getCurrentUserId();
  if (uid && isFirebaseConfigured) {
    await saveToFirestore(uid, updated);
  }
  notifySavedSetsInvalidate();
  return { ok: true };
}

export async function removeGamesFromSavedSets(
  items: Array<{ savedSetId: string; gameIndex: number }>,
): Promise<SavedSetMutationResult> {
  if (!canDeleteSavedNumbers()) {
    return {
      ok: false,
      error: "로그인한 계정의 저장번호는 삭제할 수 없습니다.",
    };
  }
  if (items.length === 0) return { ok: true };

  const bySet = new Map<string, number[]>();
  for (const item of items) {
    const list = bySet.get(item.savedSetId) ?? [];
    list.push(item.gameIndex);
    bySet.set(item.savedSetId, list);
  }

  for (const [savedSetId, indices] of bySet) {
    const sorted = [...new Set(indices)].sort((a, b) => b - a);
    for (const gameIndex of sorted) {
      const result = await removeGameFromSavedSet(savedSetId, gameIndex);
      if (!result.ok) return result;
    }
  }

  return { ok: true };
}

export async function clearAllSavedSets(): Promise<SavedSetMutationResult> {
  if (!canDeleteSavedNumbers()) {
    return {
      ok: false,
      error: "로그인한 계정의 저장번호는 전체 삭제할 수 없습니다.",
    };
  }

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
  return { ok: true };
}

/** 출력완료 상태를 로컬·Firestore에 반영 (당첨 현황 클라우드 복구용) */
export async function setSavedSetPrintDone(setId: string, done: boolean): Promise<void> {
  const uid = getCurrentUserId();
  const local = loadLocalSavedSets();
  const idx = local.findIndex((s) => s.id === setId);
  if (idx >= 0) {
    const updated = { ...local[idx], printDone: done || undefined };
    const next = [...local];
    next[idx] = updated;
    saveLocalSavedSets(next);
  }

  if (uid && isFirebaseConfigured && db) {
    try {
      await setDoc(
        doc(savedSetsCollection(uid), setId),
        { printDone: done },
        { merge: true },
      );
    } catch {
      /* ignore */
    }
  }
}

export function numberSetKey(numbers: readonly number[]): string {
  return [...numbers].sort((a, b) => a - b).join(",");
}

function bundleKey(sets: { numbers: number[] }[]): string {
  return dedupeGeneratedNumberSets(sets)
    .map((s) => numberSetKey(s.numbers))
    .sort()
    .join("|");
}

/** 이번 주(현재 회차)에 저장된 세트만 */
export function sameWeekSavedSets(existing: SavedSet[]): SavedSet[] {
  const tag = getRoundTag();
  return existing.filter((saved) => saved.roundTag === tag);
}

/** 이번 주에 이미 저장한 6개 번호 조합 */
export function sameWeekNumberKeys(existing: SavedSet[]): Set<string> {
  const keys = new Set<string>();
  for (const saved of sameWeekSavedSets(existing)) {
    for (const game of saved.sets) {
      if (game.numbers?.length === 6) {
        keys.add(numberSetKey(game.numbers));
      }
    }
  }
  return keys;
}

/** 동일한 6개 번호 조합 제거 (순서 무관) */
export function dedupeGeneratedNumberSets<
  T extends { numbers: number[]; slipPickMode?: import("@/utils/mobileSlip").SlipPickMode },
>(sets: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of sets) {
    if (!row.numbers) continue;
    if (row.slipPickMode === "A") {
      if (row.numbers.length !== 0) continue;
      const key = "auto";
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
      continue;
    }
    if (row.slipPickMode === "M") {
      if (row.numbers.length < 1 || row.numbers.length > 6) continue;
      const key = `m:${numberSetKey(row.numbers)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
      continue;
    }
    if (row.numbers.length !== 6) continue;
    const key = numberSetKey(row.numbers);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** 이번 주 저장분과 겹치는 게임 제외 */
export function excludeSameWeekSaved(
  sets: GeneratedNumbers[],
  existing: SavedSet[],
): GeneratedNumbers[] {
  const savedKeys = sameWeekNumberKeys(existing);
  const seen = new Set<string>();
  const out: GeneratedNumbers[] = [];
  for (const row of dedupeGeneratedNumberSets(sets)) {
    const key = numberSetKey(row.numbers);
    if (savedKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * 한 세트 안·이번 주 저장분 모두 고려해 서로 다른 번호만 채움.
 * 차주에는 같은 번호를 다시 추천·저장할 수 있습니다.
 */
export function fillUniqueForWeek(
  sets: GeneratedNumbers[],
  target: number,
  factory: () => GeneratedNumbers,
  existing: SavedSet[],
): GeneratedNumbers[] {
  const out = excludeSameWeekSaved(sets, existing);
  const seen = new Set(out.map((s) => numberSetKey(s.numbers)));
  for (const key of sameWeekNumberKeys(existing)) {
    seen.add(key);
  }

  let guard = 0;
  while (out.length < target && guard < target * 120) {
    guard += 1;
    const next = factory();
    if (!next.numbers || next.numbers.length !== 6) continue;
    const key = numberSetKey(next.numbers);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out.slice(0, target);
}

export async function isDuplicateNumberSets(
  sets: GeneratedNumbers[],
  existing: SavedSet[],
): Promise<boolean> {
  const unique = dedupeGeneratedNumberSets(sets);
  if (unique.length === 0) return true;

  const sameWeek = sameWeekSavedSets(existing);
  if (sameWeek.length === 0) return false;

  const incomingKey = bundleKey(unique);
  if (sameWeek.some((saved) => bundleKey(saved.sets) === incomingKey)) {
    return true;
  }

  return excludeSameWeekSaved(unique, existing).length === 0;
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
