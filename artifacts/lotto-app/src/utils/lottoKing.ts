import type { GeneratedNumbers, LottoNumbers, LottoRound } from "@/data/types";
import { getNumbers } from "@/utils/analysis";
import { dedupeGeneratedNumberSets, numberSetKey } from "@/utils/savedNumbers";
import { calcAC, generateMultiple } from "@/utils/generator";

export interface LottoKingAnalysis {
  windowSize: number;
  lastRoundNo: number;
  lastRoundNumbers: number[];
  overlapStats: { label: string; count: number; pct: number }[];
  consecutiveStats: { label: string; count: number; pct: number }[];
  threePlusRunPct: number;
  consecZoneStats: { label: string; count: number; pct: number }[];
  numberRepeatRates: { number: number; rate: number }[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function overlapCount(a: number[], b: number[]): number {
  const set = new Set(b);
  return a.filter((n) => set.has(n)).length;
}

function consecutivePairs(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) pairs += 1;
  }
  return pairs;
}

function maxRun(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function toLottoNumbers(nums: number[]): LottoNumbers {
  const sorted = [...nums].sort((a, b) => a - b);
  return [sorted[0], sorted[1], sorted[2], sorted[3], sorted[4], sorted[5]];
}

function ensureGameCount(games: GeneratedNumbers[], target: number, rounds: LottoRound[]): GeneratedNumbers[] {
  const out = dedupeGeneratedNumberSets(games);
  const seen = new Set(out.map((g) => numberSetKey(g.numbers)));
  let guard = 0;
  while (out.length < target && guard < 200) {
    guard += 1;
    const extra = generateMultiple(1, "weighted", rounds)[0];
    const key = numberSetKey(extra.numbers);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...extra, mode: "lottoking" });
  }
  return out.slice(0, target);
}

export function analyzeLottoKingWindow(rounds: LottoRound[], windowSize = 20): LottoKingAnalysis | null {
  const sorted = [...rounds].sort((a, b) => a.drwNo - b.drwNo).slice(-windowSize);
  if (sorted.length < 2) return null;

  const overlapHist = new Map<string, number>();
  const consecHist = new Map<string, number>();
  let threePlus = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = getNumbers(sorted[i - 1]);
    const cur = getNumbers(sorted[i]);
    const overlap = overlapCount(cur, prev);
    const key = `${Math.min(overlap, 3)}개`;
    overlapHist.set(key, (overlapHist.get(key) ?? 0) + 1);

    const pairs = consecutivePairs(cur);
    const cKey = pairs >= 2 ? "2쌍+" : pairs === 1 ? "1쌍" : "0쌍";
    consecHist.set(cKey, (consecHist.get(cKey) ?? 0) + 1);
    if (maxRun(cur) >= 3) threePlus += 1;
  }

  const transitions = sorted.length - 1;
  const toStats = (hist: Map<string, number>, labels: string[]) =>
    labels.map((label) => {
      const count = hist.get(label) ?? 0;
      return { label, count, pct: transitions ? Math.round((count / transitions) * 100) : 0 };
    });

  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const lastNums = getNumbers(last);
  const prevNums = getNumbers(prev);

  return {
    windowSize: sorted.length,
    lastRoundNo: last.drwNo,
    lastRoundNumbers: lastNums,
    overlapStats: toStats(overlapHist, ["0개", "1개", "2개", "3개"]),
    consecutiveStats: toStats(consecHist, ["0쌍", "1쌍", "2쌍+"]),
    threePlusRunPct: transitions ? Math.round((threePlus / transitions) * 100) : 0,
    consecZoneStats: [],
    numberRepeatRates: lastNums.map((n) => ({
      number: n,
      rate: prevNums.includes(n) ? 100 : 0,
    })),
  };
}

export function getCoverageStats(results: GeneratedNumbers[]): {
  coveragePct: number;
  uniqueCount: number;
  coveredCount: number;
  missing: number[];
} {
  const unique = new Set<number>();
  for (const r of results) {
    for (const n of r.numbers) unique.add(n);
  }
  const missing = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !unique.has(n));
  return {
    uniqueCount: unique.size,
    coveredCount: unique.size,
    coveragePct: Math.round((unique.size / 45) * 100),
    missing,
  };
}

export function generateLottoKingHybrid(rounds: LottoRound[], gameCount = 10): GeneratedNumbers[] {
  const sorted = [...rounds].sort((a, b) => a.drwNo - b.drwNo);
  const recent = sorted.slice(-20);
  const last = recent[recent.length - 1];
  const lastNums = last ? getNumbers(last) : [];

  const patternCount = Math.min(6, gameCount);
  const coverCount = Math.max(0, gameCount - patternCount);
  const games: GeneratedNumbers[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < patternCount; i++) {
    const pool = shuffle(Array.from({ length: 45 }, (_, n) => n + 1));
    const picked: number[] = [];
    const repeatCount = Math.random() < 0.7 ? 1 : 2;
    const repeats = shuffle([...lastNums]).slice(0, Math.min(repeatCount, lastNums.length));
    for (const n of repeats) picked.push(n);
    for (const n of pool) {
      if (picked.length >= 6) break;
      if (picked.includes(n)) continue;
      picked.push(n);
    }
    if (picked.length < 6) continue;
    const nums = toLottoNumbers(picked);
    const key = numberSetKey(nums);
    if (seen.has(key)) continue;
    seen.add(key);
    const overlap = overlapCount(nums, lastNums);
    games.push({
      numbers: nums,
      mode: "lottoking",
      acValue: calcAC(nums),
      score: 70 + overlap * 5,
      summary: `직전 ${overlap}개 중복`,
      lottokingDetail: {
        overlap,
        repeatFromLast: nums.filter((n) => lastNums.includes(n)),
        consecutiveRanges: [],
        consecutivePairCount: consecutivePairs(nums),
        maxRun: maxRun(nums),
      },
    });
  }

  const used = new Set(games.flatMap((g) => g.numbers));
  for (let i = 0; i < coverCount; i++) {
    const missing = Array.from({ length: 45 }, (_, n) => n + 1).filter((n) => !used.has(n));
    const seed = missing.length > 0 ? shuffle(missing).slice(0, Math.min(3, missing.length)) : [];
    const pool = shuffle(Array.from({ length: 45 }, (_, n) => n + 1));
    const picked: number[] = [...seed];
    for (const n of pool) {
      if (picked.length >= 6) break;
      if (picked.includes(n)) continue;
      picked.push(n);
      used.add(n);
    }
    if (picked.length < 6) continue;
    const nums = toLottoNumbers(picked);
    const key = numberSetKey(nums);
    if (seen.has(key)) continue;
    seen.add(key);
    games.push({
      numbers: nums,
      mode: "lottoking",
      acValue: calcAC(nums),
      score: 60,
      summary: "커버 조합",
      lottokingDetail: {
        overlap: overlapCount(nums, lastNums),
        repeatFromLast: nums.filter((n) => lastNums.includes(n)),
        consecutiveRanges: [],
        consecutivePairCount: consecutivePairs(nums),
        maxRun: maxRun(nums),
      },
    });
  }

  return ensureGameCount(games, gameCount, rounds);
}
