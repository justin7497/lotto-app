/**
 * CLI backtest — run from repo root:
 *   pnpm exec tsx artifacts/lotto-app/scripts/run-backtest.mts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LottoRound } from "../src/data/types.ts";
import { getNumbers } from "../src/utils/analysis.ts";
import { generateMultiple, generateWeeklyGames } from "../src/utils/generator.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dir, "../src/data/lottoData.json");
const rounds = JSON.parse(readFileSync(dataPath, "utf-8")) as LottoRound[];

const MODES = ["balanced", "weighted", "delta", "sector", "tail", "consecutive", "monte"] as const;
const GAMES = 10;
const TEST_SLICE = 30;

function countMatches(a: number[], b: number[]): number {
  return a.filter((n) => b.includes(n)).length;
}

function scoreHits(h: { e3: number; e4: number; e5: number; e6: number }) {
  return h.e3 + h.e4 * 5 + h.e5 * 25 + h.e6 * 200;
}

const sorted = [...rounds].sort((a, b) => a.drwNo - b.drwNo);
const testRounds = sorted.slice(-TEST_SLICE);

type Hits = { e3: number; e4: number; e5: number; e6: number; total: number };
const stats = new Map<string, Hits>();

for (const m of [...MODES, "weekly-lite", "ensemble"]) {
  stats.set(m, { e3: 0, e4: 0, e5: 0, e6: 0, total: 0 });
}

for (const round of testRounds) {
  const past = sorted.filter((r) => r.drwNo < round.drwNo);
  const actual = getNumbers(round);

  for (const mode of MODES) {
    const opts = mode === "monte" ? { monteSimCount: 8000 } : {};
    const combos = generateMultiple(GAMES, mode, past, opts);
    const h = stats.get(mode)!;
    h.total += combos.length;
    for (const c of combos) {
      const mc = countMatches([...c.numbers], actual);
      if (mc === 3) h.e3++;
      else if (mc === 4) h.e4++;
      else if (mc === 5) h.e5++;
      else if (mc === 6) h.e6++;
    }
  }

  const weekly = generateWeeklyGames(past, {
    gameCount: GAMES,
    candidateCount: 50000,
    topCandidateCount: 2000,
  });
  const wh = stats.get("weekly-lite")!;
  wh.total += weekly.length;
  for (const c of weekly) {
    const mc = countMatches([...c.numbers], actual);
    if (mc === 3) wh.e3++;
    else if (mc === 4) wh.e4++;
    else if (mc === 5) wh.e5++;
    else if (mc === 6) wh.e6++;
  }

  const ensemble = generateMultiple(GAMES, "ensemble", past, { monteSimCount: 5000 });
  const eh = stats.get("ensemble")!;
  eh.total += ensemble.length;
  for (const c of ensemble) {
    const mc = countMatches([...c.numbers], actual);
    if (mc === 3) eh.e3++;
    else if (mc === 4) eh.e4++;
    else if (mc === 5) eh.e5++;
    else if (mc === 6) eh.e6++;
  }
}

const rows = [...stats.entries()]
  .map(([mode, h]) => ({
    mode,
    score: scoreHits(h),
    rate3plus: (((h.e3 + h.e4 + h.e5 + h.e6) / h.total) * 100).toFixed(3),
    ...h,
  }))
  .sort((a, b) => b.score - a.score);

console.log(`Rounds tested: ${testRounds.length} (${testRounds[0]?.drwNo}–${testRounds.at(-1)?.drwNo}), ${GAMES} games/mode/round\n`);
console.table(rows);
