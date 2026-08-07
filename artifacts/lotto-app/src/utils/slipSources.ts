import type { GeneratorMode } from "@/data/types";
import { favoritePickToSlipGame, loadFavoritePicks } from "@/utils/favoriteNumbers";
import type { SlipGame } from "@/utils/mobileSlip";
import { loadSavedSets, type SavedSet } from "@/utils/savedNumbers";

export type SlipSourceId = "king" | "saju" | "recommend" | "mypicks";

export const SLIP_SOURCES: Array<{
  id: SlipSourceId;
  label: string;
}> = [
  { id: "king", label: "패턴" },
  { id: "saju", label: "사주" },
  { id: "recommend", label: "스마트" },
  { id: "mypicks", label: "내번호" },
];

const RECOMMEND_MODES = new Set<GeneratorMode>([
  "balanced",
  "weighted",
  "random",
  "monte",
  "delta",
  "sector",
  "tail",
  "consecutive",
  "fixed",
]);

export function isRecommendMode(mode: GeneratorMode): boolean {
  return RECOMMEND_MODES.has(mode);
}

export function filterSavedBySource(sets: SavedSet[], source: SlipSourceId): SavedSet[] {
  if (source === "king") return sets.filter((s) => s.mode === "lottoking");
  if (source === "saju") return sets.filter((s) => s.mode === "saju");
  if (source === "recommend") return sets.filter((s) => isRecommendMode(s.mode));
  return [];
}

/** 슬립지에 넣을 게임 (최신순) */
export async function loadGamesFromSource(source: SlipSourceId): Promise<SlipGame[]> {
  if (source === "mypicks") {
    const picks = await loadFavoritePicks();
    return picks
      .slice()
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .map((p) => favoritePickToSlipGame(p));
  }

  const sets = filterSavedBySource(await loadSavedSets(), source);
  const games: SlipGame[] = [];

  for (const saved of sets) {
    for (const g of saved.sets) {
      if (!g?.numbers || g.numbers.length !== 6) continue;
      games.push({
        numbers: [...g.numbers].sort((a, b) => a - b),
        mode: "M",
      });
    }
  }
  return games;
}

export function countGamesInSaved(sets: SavedSet[], source: Exclude<SlipSourceId, "mypicks">): number {
  return filterSavedBySource(sets, source).reduce((n, s) => n + s.sets.length, 0);
}
