import type { GeneratedNumbers, GeneratorMode, LottoRound } from "@/data/types";

const API_BASE = "/api";
const MIGRATION_KEY = "lotto_migrated_v3";
const LEGACY_KEY = "lotto_saved_numbers";
export const MAX_SAVED_SETS = 50;

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

function getNextRoundInfo(): { roundNo: number; drawDate: string } {
  const BASE_ROUND = 1221;
  const KST = 9 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  // Round 1221 draws on Saturday April 25, 2026 00:00 KST = April 24 15:00 UTC
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

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

async function apiDelete(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      credentials: "include",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch { return false; }
}

async function migrateLegacyData(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) { localStorage.setItem(MIGRATION_KEY, "1"); return; }
    const legacy: SavedSet[] = JSON.parse(raw);
    if (legacy.length > 0) {
      for (const s of legacy.slice(0, MAX_SAVED_SETS)) {
        await apiPost("/saved-numbers", s);
      }
    }
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(MIGRATION_KEY, "1");
  } catch { localStorage.setItem(MIGRATION_KEY, "1"); }
}

export async function loadSavedSets(): Promise<SavedSet[]> {
  await migrateLegacyData();
  const rows = await apiGet<SavedSet[]>("/saved-numbers");
  return rows ?? [];
}

export async function saveNumberSets(
  sets: GeneratedNumbers[],
  subLabel?: string
): Promise<SavedSet> {
  const newSet: SavedSet = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sets,
    mode: sets[0]?.mode ?? "random",
    savedAt: new Date().toISOString(),
    roundTag: getRoundTag(),
    subLabel: subLabel ?? null,
  };
  await apiPost("/saved-numbers", newSet);
  return newSet;
}

export async function deleteNumberSet(id: string): Promise<void> {
  await apiDelete(`/saved-numbers/${id}`);
}

export async function clearAllSavedSets(): Promise<void> {
  await apiDelete("/saved-numbers/all");
}

export async function isDuplicateNumberSets(
  sets: GeneratedNumbers[],
  existing: SavedSet[]
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
