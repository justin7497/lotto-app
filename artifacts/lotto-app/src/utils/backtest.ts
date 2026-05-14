import type { LottoRound, LottoNumbers, GeneratorMode } from "@/data/types";
import { generateMultiple } from "./generator";
import { getNumbers } from "./analysis";

export const BACKTEST_MODES: GeneratorMode[] = [
  "balanced", "weighted", "delta", "sector", "tail", "consecutive", "monte",
];

export const BACKTEST_MODE_LABELS: Record<string, string> = {
  balanced: "균형 필터",
  weighted: "AI 가중치",
  delta: "델타 시스템",
  sector: "구간 분산",
  tail: "끝수 기반",
  consecutive: "연번 기반",
  monte: "몬테카를로",
};

export interface ModeStats {
  mode: GeneratorMode;
  label: string;
  totalCombos: number;
  exact3: number;
  exact4: number;
  exact5: number;
  exact6: number;
  score: number;
}

export interface HallOfFameEntry {
  round: number;
  mode: GeneratorMode;
  numbers: LottoNumbers;
  matchCount: number;
}

export interface BacktestResult {
  completedRounds: number;
  totalRounds: number;
  modeStats: ModeStats[];
  hallOfFame: HallOfFameEntry[];
  gamesPerMode: number;
  runAt: string;
}

function countMatches(generated: number[], actual: number[]): number {
  return generated.filter((n) => actual.includes(n)).length;
}

function calcScore(s: Pick<ModeStats, "exact3" | "exact4" | "exact5" | "exact6">): number {
  return s.exact3 * 1 + s.exact4 * 5 + s.exact5 * 25 + s.exact6 * 200;
}

export async function runBacktest(
  allRounds: LottoRound[],
  gamesPerMode: number,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<BacktestResult> {
  const sorted = [...allRounds].sort((a, b) => a.drwNo - b.drwNo);
  const testRounds = sorted.slice(20);
  const total = testRounds.length;

  const statsMap = new Map<GeneratorMode, ModeStats>();
  for (const mode of BACKTEST_MODES) {
    statsMap.set(mode, {
      mode,
      label: BACKTEST_MODE_LABELS[mode],
      totalCombos: 0,
      exact3: 0,
      exact4: 0,
      exact5: 0,
      exact6: 0,
      score: 0,
    });
  }

  const hallOfFame: HallOfFameEntry[] = [];

  for (let i = 0; i < testRounds.length; i++) {
    if (signal?.aborted) break;

    const round = testRounds[i];
    const pastRounds = sorted.slice(0, sorted.indexOf(round));
    const actual = getNumbers(round);

    for (const mode of BACKTEST_MODES) {
      const opts = mode === "monte" ? { monteSimCount: 5000 } : {};
      const combos = generateMultiple(gamesPerMode, mode, pastRounds, opts);
      const stats = statsMap.get(mode)!;
      stats.totalCombos += combos.length;

      for (const combo of combos) {
        const mc = countMatches([...combo.numbers], [...actual]);
        if (mc === 3) stats.exact3++;
        else if (mc === 4) stats.exact4++;
        else if (mc === 5) stats.exact5++;
        else if (mc === 6) stats.exact6++;

        if (mc >= 4) {
          hallOfFame.push({
            round: round.drwNo,
            mode,
            numbers: combo.numbers,
            matchCount: mc,
          });
        }
      }
    }

    if (i % 5 === 0 || i === testRounds.length - 1) {
      onProgress(i + 1, total);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress(total, total);

  for (const stats of statsMap.values()) {
    stats.score = calcScore(stats);
  }

  const modeStats = Array.from(statsMap.values()).sort((a, b) => b.score - a.score);

  hallOfFame.sort((a, b) => b.matchCount - a.matchCount);

  return {
    completedRounds: testRounds.length,
    totalRounds: allRounds.length,
    modeStats,
    hallOfFame: hallOfFame.slice(0, 10),
    gamesPerMode,
    runAt: new Date().toISOString(),
  };
}

const CACHE_KEY = "lotto_backtest_result";

export function saveBacktestResult(result: BacktestResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {}
}

export function loadBacktestResult(): BacktestResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as BacktestResult) : null;
  } catch {
    return null;
  }
}
