import { parseRoundNo, type SavedSet } from "@/utils/savedNumbers";
import { MODE_INFO } from "@/data/generatorModes";
import { isRecommendMode } from "@/utils/slipSources";
import { filterSlipGamesByCategory, getIssuedSheetsForCategory, loadSlipDraft } from "@/utils/slipDraft";

export type SavedNumberGameItem = {
  key: string;
  savedSetId: string;
  gameIndex: number;
  numbers: number[];
  slipPickMode?: import("@/utils/mobileSlip").SlipPickMode;
  roundTag: string;
  savedAt: string;
  sourceLabel: string;
  savedAtLabel: string;
};

export type SavedNumberEventGroup = {
  savedSetId: string;
  roundTag: string;
  savedAt: string;
  savedAtLabel: string;
  sourceLabel: string;
  games: SavedNumberGameItem[];
};

function formatSavedAtLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function savedSetSourceLabel(saved: SavedSet): string {
  const sub = saved.subLabel?.trim();
  if (sub) return sub;

  if (saved.mode === "lottoking") return "행운 · 패턴번호";
  if (saved.mode === "saju") return "사주 · 행운번호";

  if (isRecommendMode(saved.mode) && saved.mode in MODE_INFO) {
    return `스마트 · ${MODE_INFO[saved.mode as keyof typeof MODE_INFO].label}`;
  }

  return "저장 번호";
}

function sameSavedNumbers(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((n, i) => n === sb[i]);
}

/** 현재 일반번호 QR 슬립지에 들어 있는 나의 로또번호 항목 */
export function getMyNumberSlipCompletedKeys(sets: SavedSet[]): Set<string> {
  const draft = loadSlipDraft();
  const issued = draft.issuedSheets;
  const slipGames = issued
    ? getIssuedSheetsForCategory(issued, "regular").flat()
    : filterSlipGamesByCategory(draft.games, "regular");
  if (slipGames.length === 0) return new Set();

  const savedGames = flattenSavedGames(sets);
  const keys = new Set<string>();

  for (const slipGame of slipGames) {
    if (!slipGame.savedSetId) continue;
    const match = savedGames.find(
      (item) =>
        item.savedSetId === slipGame.savedSetId &&
        sameSavedNumbers(item.numbers, slipGame.numbers),
    );
    if (match) keys.add(match.key);
  }

  return keys;
}

function buildSavedGameItems(saved: SavedSet): SavedNumberGameItem[] {
  const sourceLabel = savedSetSourceLabel(saved);
  const savedAtLabel = formatSavedAtLabel(saved.savedAt);
  const items: SavedNumberGameItem[] = [];

  saved.sets.forEach((row, gameIndex) => {
    const numbers = (Array.isArray(row.numbers) ? row.numbers : [])
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
    const pickMode = row.slipPickMode;
    const isAuto = pickMode === "A" && numbers.length === 0;
    const isPick = pickMode === "M" && numbers.length >= 1 && numbers.length <= 6;
    const isFullManual = !pickMode && numbers.length === 6;
    if (!isAuto && !isPick && !isFullManual) return;

    items.push({
      key: `${saved.id}:${gameIndex}`,
      savedSetId: saved.id,
      gameIndex,
      numbers: [...numbers],
      slipPickMode: pickMode,
      roundTag: saved.roundTag,
      savedAt: saved.savedAt,
      sourceLabel,
      savedAtLabel,
    });
  });

  return items;
}

export function groupSavedGamesByEvent(sets: SavedSet[]): SavedNumberEventGroup[] {
  return sets
    .map((saved) => ({
      savedSetId: saved.id,
      roundTag: saved.roundTag,
      savedAt: saved.savedAt,
      savedAtLabel: formatSavedAtLabel(saved.savedAt),
      sourceLabel: savedSetSourceLabel(saved),
      games: buildSavedGameItems(saved),
    }))
    .filter((group) => group.games.length > 0)
    .sort((a, b) => {
      const roundDiff = (parseRoundNo(b.roundTag) ?? 0) - (parseRoundNo(a.roundTag) ?? 0);
      if (roundDiff !== 0) return roundDiff;
      return Date.parse(b.savedAt) - Date.parse(a.savedAt);
    });
}

export function flattenSavedGames(sets: SavedSet[]): SavedNumberGameItem[] {
  return groupSavedGamesByEvent(sets).flatMap((group) => group.games);
}
