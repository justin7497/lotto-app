import type { LottoRound } from "@/data/types";
import type { FavoritePick } from "@/utils/favoriteNumbers";
import { FAVORITE_LEGACY_ROUND_TAG } from "@/utils/favoriteNumbers";
import type { SlipGameSourceId } from "@/utils/slipGameMeta";
import {
  loadSlipDraft,
  type SlipSheet,
  type SlipSheetStore,
} from "@/utils/slipDraft";
import {
  checkWinResult,
  getRoundTag,
  numberSetKey,
  parseRoundNo,
  type SavedSet,
  type WinResult,
} from "@/utils/savedNumbers";
import {
  SLIP_SOURCES,
  type SlipSourceId,
} from "@/utils/slipSources";

export interface WinHistoryGame {
  id: string;
  numbers: number[];
  source: SlipSourceId;
  roundTag: string;
  bundleLabel: string;
}

export interface RoundWinStats {
  ranks: Record<string, number>;
  noWin: number;
  pending: number;
  total: number;
}

export interface RoundWinGroup {
  roundTag: string;
  round: LottoRound | null;
  stats: RoundWinStats;
  bySource: Record<SlipSourceId, WinHistoryGame[]>;
}

const SOURCE_ORDER: SlipSourceId[] = ["king", "saju", "recommend", "mypicks"];

function sourceFromSavedSet(saved: SavedSet): SlipSourceId {
  if (saved.mode === "lottoking") return "king";
  if (saved.mode === "saju") return "saju";
  return "recommend";
}

function sourceFromSlipGame(source?: SlipGameSourceId): SlipSourceId {
  if (source === "king") return "king";
  if (source === "saju") return "saju";
  if (source === "mypicks") return "mypicks";
  return "recommend";
}

function collectIssuedSheets(store: SlipSheetStore | undefined): SlipSheet[] {
  if (!store) return [];
  return [...store.regular, ...store.fixed];
}

/** QR 슬립지에서 「발급완료」한 게임만 당첨 전광판에 반영 */
export function collectWinHistoryGames(
  savedSets: SavedSet[],
  picks: FavoritePick[],
): WinHistoryGame[] {
  const draft = loadSlipDraft();
  const doneSheetIds = new Set(draft.printDoneSheetIds ?? []);
  if (doneSheetIds.size === 0) return [];

  const savedById = new Map(savedSets.map((row) => [row.id, row]));
  const pickById = new Map(picks.map((row) => [row.id, row]));
  const games: WinHistoryGame[] = [];

  for (const sheet of collectIssuedSheets(draft.issuedSheets)) {
    const anchorId = sheet[0]?.id;
    if (!anchorId || !doneSheetIds.has(anchorId)) continue;

    sheet.forEach((game, index) => {
      if (!game.numbers || game.numbers.length !== 6) return;

      let roundTag = getRoundTag();
      let source = sourceFromSlipGame(game.source);
      let bundleLabel = game.sourceLabel ?? `게임 ${index + 1}`;

      if (game.savedSetId) {
        const saved = savedById.get(game.savedSetId);
        if (saved) {
          roundTag = saved.roundTag;
          source = sourceFromSavedSet(saved);
          const gameIndex = saved.sets.findIndex(
            (row) =>
              row.numbers?.length === 6 &&
              numberSetKey(row.numbers) === numberSetKey(game.numbers),
          );
          const labelIndex = gameIndex >= 0 ? gameIndex + 1 : index + 1;
          bundleLabel =
            saved.subLabel ??
            `${SLIP_SOURCES.find((s) => s.id === source)?.label ?? ""} ${labelIndex}`;
        }
      } else if (game.favoritePickId) {
        const pick = pickById.get(game.favoritePickId);
        if (pick) {
          roundTag = pick.roundTag ?? FAVORITE_LEGACY_ROUND_TAG;
          source = "mypicks";
          bundleLabel = pick.name || "내번호";
        }
      }

      games.push({
        id: `${anchorId}-${game.id}`,
        numbers: [...game.numbers],
        source,
        roundTag,
        bundleLabel,
      });
    });
  }

  return games;
}

export function computeGameWinResult(
  numbers: number[],
  round: LottoRound | null,
): WinResult | null {
  if (!round) return null;
  return checkWinResult(numbers, round);
}

export function computeRoundStats(
  games: WinHistoryGame[],
  roundMap: Map<number, LottoRound>,
): RoundWinStats {
  const stats: RoundWinStats = { ranks: {}, noWin: 0, pending: 0, total: games.length };
  for (const g of games) {
    const roundNo = parseRoundNo(g.roundTag);
    const round = roundNo !== null ? (roundMap.get(roundNo) ?? null) : null;
    if (!round) {
      stats.pending += 1;
      continue;
    }
    const result = checkWinResult(g.numbers, round);
    if (result.rank !== null) {
      const key = String(result.rank);
      stats.ranks[key] = (stats.ranks[key] ?? 0) + 1;
    } else {
      stats.noWin += 1;
    }
  }
  return stats;
}

function emptyBySource(): Record<SlipSourceId, WinHistoryGame[]> {
  return { king: [], saju: [], recommend: [], mypicks: [] };
}

export function groupWinHistoryByRound(
  games: WinHistoryGame[],
  roundMap: Map<number, LottoRound>,
): RoundWinGroup[] {
  const buckets = new Map<string, WinHistoryGame[]>();
  for (const g of games) {
    const arr = buckets.get(g.roundTag) ?? [];
    arr.push(g);
    buckets.set(g.roundTag, arr);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (parseRoundNo(b[0]) ?? 0) - (parseRoundNo(a[0]) ?? 0))
    .map(([roundTag, roundGames]) => {
      const roundNo = parseRoundNo(roundTag);
      const round = roundNo !== null ? (roundMap.get(roundNo) ?? null) : null;
      const bySource = emptyBySource();
      for (const g of roundGames) {
        bySource[g.source].push(g);
      }
      for (const id of SOURCE_ORDER) {
        bySource[id].sort((a, b) => a.bundleLabel.localeCompare(b.bundleLabel));
      }
      return {
        roundTag,
        round,
        stats: computeRoundStats(roundGames, roundMap),
        bySource,
      };
    });
}

export function aggregateWinStats(groups: RoundWinGroup[]): RoundWinStats {
  const stats: RoundWinStats = { ranks: {}, noWin: 0, pending: 0, total: 0 };
  for (const g of groups) {
    stats.total += g.stats.total;
    stats.noWin += g.stats.noWin;
    stats.pending += g.stats.pending;
    for (const [rank, cnt] of Object.entries(g.stats.ranks)) {
      stats.ranks[rank] = (stats.ranks[rank] ?? 0) + cnt;
    }
  }
  return stats;
}

export function countWinningGames(groups: RoundWinGroup[]): number {
  let n = 0;
  for (const g of groups) {
    for (const key of Object.keys(g.stats.ranks)) {
      n += g.stats.ranks[key] ?? 0;
    }
  }
  return n;
}

export function formatRoundWinSummary(stats: RoundWinStats): string {
  if (stats.total === 0) return "저장 없음";
  if (stats.pending === stats.total) return "결과 대기";
  const parts: string[] = [];
  for (const rank of ["1", "2", "3", "4", "5"]) {
    const cnt = stats.ranks[rank] ?? 0;
    if (cnt > 0) parts.push(`${rank}등 ${cnt}`);
  }
  if (parts.length > 0) return parts.join(" · ");
  return "당첨 없음";
}

export function sourceLabel(source: SlipSourceId): string {
  return SLIP_SOURCES.find((s) => s.id === source)?.label ?? source;
}
