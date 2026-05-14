import type { LottoRound, LottoNumbers, GeneratedNumbers } from "@/data/types";
import { getNumbers } from "./analysis";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function calcAC(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const diffs = new Set<number>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      diffs.add(sorted[j] - sorted[i]);
    }
  }
  return diffs.size - (sorted.length - 1);
}

export interface GenOptions {
  exclude?: number[];
  acFilter?: boolean;
  sectorFilter?: boolean;
  tailSumFilter?: boolean;
  sameTailFilter?: boolean;
  consecutiveFilter?: boolean;
  monteSimCount?: number;
}

function buildPool(all: number[], exclude: number[]): number[] {
  return all.filter((n) => !exclude.includes(n));
}

function isValid(nums: number[], acFilter: boolean): boolean {
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum < 110 || sum > 180) return false;
  const odd = sorted.filter((n) => n % 2 !== 0).length;
  if (odd < 2 || odd > 4) return false;
  const high = sorted.filter((n) => n >= 24).length;
  if (high < 1 || high > 5) return false;
  if (acFilter) {
    const ac = calcAC(sorted);
    if (ac < 7 || ac > 9) return false;
  }
  return true;
}

function passesExtraFilters(nums: number[], opts: GenOptions): boolean {
  const sorted = [...nums].sort((a, b) => a - b);

  if (opts.sectorFilter) {
    const inZone = [
      sorted.some((n) => n >= 1 && n <= 9),
      sorted.some((n) => n >= 10 && n <= 19),
      sorted.some((n) => n >= 20 && n <= 29),
      sorted.some((n) => n >= 30 && n <= 39),
      sorted.some((n) => n >= 40 && n <= 45),
    ];
    if (!inZone.every(Boolean)) return false;
  }

  if (opts.tailSumFilter) {
    const tailSum = sorted.reduce((s, n) => s + (n % 10), 0);
    if (tailSum < 20 || tailSum > 35) return false;
  }

  if (opts.sameTailFilter) {
    const tails = sorted.map((n) => n % 10);
    const hasSame = tails.some((t, i) => tails.indexOf(t) !== i);
    if (!hasSame) return false;
  }

  if (opts.consecutiveFilter) {
    const hasConsec = sorted.some((n, i) => i > 0 && sorted[i] - sorted[i - 1] === 1);
    if (!hasConsec) return false;
  }

  return true;
}

function scoreCombo(sorted: number[], freqMap: Float32Array): number {
  const sum = sorted.reduce((a, b) => a + b, 0);
  const odd = sorted.filter((n) => n % 2 !== 0).length;
  const high = sorted.filter((n) => n >= 24).length;
  const ac = calcAC(sorted);

  const sumScore =
    sum >= 130 && sum <= 160 ? 4 : sum >= 115 && sum <= 175 ? 2 : sum >= 110 && sum <= 180 ? 1 : 0;
  const oddScore = odd === 3 ? 4 : odd === 2 || odd === 4 ? 2 : 0;
  const highScore = high === 3 ? 4 : high === 2 || high === 4 ? 2 : 0;
  const acScore = ac >= 7 && ac <= 9 ? 4 : ac === 6 || ac === 10 ? 2 : ac === 5 || ac === 11 ? 1 : 0;
  const freqScore = sorted.reduce((s, n) => s + freqMap[n], 0) / 6;

  return sumScore * 2 + oddScore + highScore + acScore + freqScore * 0.5;
}

export function generateBalanced(opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [], acFilter = false } = opts;
  const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), exclude);
  if (pool.length < 6) return generateRandom(opts);

  let attempts = 0;
  while (attempts < 20000) {
    const picked = shuffle(pool).slice(0, 6);
    if (isValid(picked, acFilter) && passesExtraFilters(picked, opts)) {
      const sorted = picked.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "balanced", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  return generateRandom(opts);
}

export function generateWeighted(rounds: LottoRound[], opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [], acFilter = false } = opts;
  const recent = [...rounds].sort((a, b) => b.drwNo - a.drwNo).slice(0, 200);
  const weights: number[] = new Array(46).fill(1);
  for (const r of recent) {
    for (const n of getNumbers(r)) {
      weights[n] += 3;
    }
  }

  const pool: number[] = [];
  for (let i = 1; i <= 45; i++) {
    if (exclude.includes(i)) continue;
    for (let j = 0; j < weights[i]; j++) {
      pool.push(i);
    }
  }
  if (pool.length < 6) return generateRandom(opts);

  let attempts = 0;
  while (attempts < 20000) {
    const picked: number[] = [];
    const shuffled = shuffle(pool);
    for (const n of shuffled) {
      if (!picked.includes(n)) picked.push(n);
      if (picked.length === 6) break;
    }
    if (picked.length === 6 && isValid(picked, acFilter) && passesExtraFilters(picked, opts)) {
      const sorted = picked.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "weighted", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  return generateRandom(opts);
}

export function generateRandom(opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [], acFilter = false } = opts;
  const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), exclude);
  if (pool.length < 6) {
    const fallbackPool = Array.from({ length: 45 }, (_, i) => i + 1);
    const sorted = shuffle(fallbackPool).slice(0, 6).sort((a, b) => a - b) as LottoNumbers;
    return { numbers: sorted, mode: "random", acValue: calcAC(sorted) };
  }

  let attempts = 0;
  while (attempts < 20000) {
    const picked = shuffle(pool).slice(0, 6);
    if ((!acFilter || (calcAC(picked) >= 7 && calcAC(picked) <= 9)) && passesExtraFilters(picked, opts)) {
      const sorted = picked.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "random", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  const sorted = shuffle(pool).slice(0, 6).sort((a, b) => a - b) as LottoNumbers;
  return { numbers: sorted, mode: "random", acValue: calcAC(sorted) };
}

export function generateDelta(rounds: LottoRound[], opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [] } = opts;
  const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), exclude);
  if (pool.length < 6) return { ...generateRandom(opts), mode: "delta" };

  const deltaFreq: number[] = new Array(46).fill(1);
  for (const r of rounds) {
    const nums = getNumbers(r).sort((a, b) => a - b);
    for (let i = 1; i < nums.length; i++) {
      const d = nums[i] - nums[i - 1];
      if (d >= 1 && d <= 44) deltaFreq[d]++;
    }
  }

  const deltaPool: number[] = [];
  for (let d = 1; d <= 20; d++) {
    const weight = Math.max(1, Math.round(deltaFreq[d] / 40));
    for (let j = 0; j < weight; j++) deltaPool.push(d);
  }

  const poolSet = new Set(pool);
  let attempts = 0;
  while (attempts < 40000) {
    const deltas = Array.from({ length: 5 }, () => deltaPool[Math.floor(Math.random() * deltaPool.length)]);
    const totalSpan = deltas.reduce((a, b) => a + b, 0);
    if (totalSpan > 40) { attempts++; continue; }

    const maxStart = 45 - totalSpan;
    const validStarts = pool.filter((n) => n <= maxStart);
    if (validStarts.length === 0) { attempts++; continue; }

    const start = validStarts[Math.floor(Math.random() * validStarts.length)];
    const nums: number[] = [start];
    let cur = start;
    let ok = true;
    for (const d of deltas) {
      cur += d;
      if (cur > 45 || !poolSet.has(cur) || nums.includes(cur)) { ok = false; break; }
      nums.push(cur);
    }

    if (ok && nums.length === 6 && isValid(nums, opts.acFilter ?? false) && passesExtraFilters(nums, opts)) {
      const sorted = nums.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "delta", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  return { ...generateRandom(opts), mode: "delta" };
}

export function generateSector(opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [] } = opts;
  const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), exclude);
  if (pool.length < 6) return { ...generateRandom(opts), mode: "sector" };

  const zones = [
    pool.filter((n) => n >= 1 && n <= 9),
    pool.filter((n) => n >= 10 && n <= 19),
    pool.filter((n) => n >= 20 && n <= 29),
    pool.filter((n) => n >= 30 && n <= 39),
    pool.filter((n) => n >= 40 && n <= 45),
  ].filter((z) => z.length > 0);

  if (zones.length < 3) return { ...generateRandom(opts), mode: "sector" };

  let attempts = 0;
  while (attempts < 20000) {
    const picked: number[] = [];
    const shuffledZones = shuffle([...zones]);
    for (const zone of shuffledZones) {
      if (picked.length >= 6) break;
      const candidates = zone.filter((n) => !picked.includes(n));
      if (candidates.length > 0) {
        picked.push(candidates[Math.floor(Math.random() * candidates.length)]);
      }
    }
    while (picked.length < 6) {
      const rem = pool.filter((n) => !picked.includes(n));
      if (rem.length === 0) break;
      picked.push(rem[Math.floor(Math.random() * rem.length)]);
    }

    if (picked.length === 6 && isValid(picked, opts.acFilter ?? false) && passesExtraFilters(picked, opts)) {
      const sorted = picked.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "sector", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  return { ...generateRandom(opts), mode: "sector" };
}

export function generateTailDigit(opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [] } = opts;
  const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), exclude);
  if (pool.length < 6) return { ...generateRandom(opts), mode: "tail" };

  const byTail = new Map<number, number[]>();
  for (const n of pool) {
    const t = n % 10;
    if (!byTail.has(t)) byTail.set(t, []);
    byTail.get(t)!.push(n);
  }

  const tails = Array.from(byTail.keys());

  let attempts = 0;
  while (attempts < 20000) {
    const shuffledTails = shuffle(tails);
    const picked: number[] = [];
    for (const t of shuffledTails) {
      if (picked.length >= 6) break;
      const arr = byTail.get(t)!;
      const n = arr[Math.floor(Math.random() * arr.length)];
      if (!picked.includes(n)) picked.push(n);
    }

    if (picked.length === 6 && isValid(picked, opts.acFilter ?? false) && passesExtraFilters(picked, opts)) {
      const sorted = picked.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "tail", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  return { ...generateRandom(opts), mode: "tail" };
}

export function generateConsecutive(opts: GenOptions = {}): GeneratedNumbers {
  const { exclude = [] } = opts;
  const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), exclude);
  if (pool.length < 6) return { ...generateRandom(opts), mode: "consecutive" };

  const poolSet = new Set(pool);
  const pairs: [number, number][] = pool
    .filter((n) => n < 45 && poolSet.has(n + 1))
    .map((n) => [n, n + 1]);

  if (pairs.length === 0) return { ...generateRandom(opts), mode: "consecutive" };

  let attempts = 0;
  while (attempts < 20000) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const remaining = shuffle(pool.filter((n) => !pair.includes(n)));
    const picked = [...pair, ...remaining.slice(0, 4)];

    if (picked.length === 6 && isValid(picked, opts.acFilter ?? false) && passesExtraFilters(picked, opts)) {
      const sorted = picked.sort((a, b) => a - b) as LottoNumbers;
      return { numbers: sorted, mode: "consecutive", acValue: calcAC(sorted) };
    }
    attempts++;
  }
  return { ...generateRandom(opts), mode: "consecutive" };
}

export function generateMultiple(
  count: number,
  mode: "balanced" | "weighted" | "random" | "monte" | "delta" | "sector" | "tail" | "consecutive",
  rounds: LottoRound[],
  opts: GenOptions = {}
): GeneratedNumbers[] {
  if (mode === "monte") {
    const pool = buildPool(Array.from({ length: 45 }, (_, i) => i + 1), opts.exclude ?? []);
    if (pool.length < 6) return Array.from({ length: count }, () => generateRandom(opts));

    const freqMap = new Float32Array(46);
    const total = rounds.length || 1;
    for (const r of rounds) {
      for (const n of getNumbers(r)) freqMap[n] += 1;
    }
    for (let i = 1; i <= 45; i++) freqMap[i] = freqMap[i] / total;

    type Candidate = { nums: number[]; score: number };
    const TOP_K = 800;
    const candidates: Candidate[] = [];
    let minScore = -Infinity;
    const simCount = opts.monteSimCount ?? 150000;

    for (let s = 0; s < simCount; s++) {
      const picked = shuffle(pool).slice(0, 6);
      const sorted = picked.sort((a, b) => a - b);
      const score = scoreCombo(sorted, freqMap);
      if (candidates.length < TOP_K || score > minScore) {
        candidates.push({ nums: [...sorted], score });
        if (candidates.length > TOP_K * 1.5) {
          candidates.sort((a, b) => b.score - a.score);
          candidates.length = TOP_K;
          minScore = candidates[TOP_K - 1].score;
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const hasExtraFilters =
      opts.acFilter || opts.sectorFilter || opts.tailSumFilter || opts.sameTailFilter || opts.consecutiveFilter;
    const filtered = hasExtraFilters
      ? candidates.filter((c) => {
          if (opts.acFilter) {
            const ac = calcAC(c.nums);
            if (ac < 7 || ac > 9) return false;
          }
          return passesExtraFilters(c.nums, opts);
        })
      : candidates;
    const usePool = filtered.length >= count ? filtered : candidates;
    const shuffledTop = shuffle(usePool.slice(0, TOP_K));
    return shuffledTop.slice(0, count).map((c) => ({
      numbers: c.nums as LottoNumbers,
      mode: "monte" as const,
      acValue: calcAC(c.nums),
    }));
  }

  if (mode === "delta") {
    return Array.from({ length: count }, () => generateDelta(rounds, opts));
  }
  if (mode === "sector") {
    return Array.from({ length: count }, () => generateSector(opts));
  }
  if (mode === "tail") {
    return Array.from({ length: count }, () => generateTailDigit(opts));
  }
  if (mode === "consecutive") {
    return Array.from({ length: count }, () => generateConsecutive(opts));
  }

  const results: GeneratedNumbers[] = [];
  for (let i = 0; i < count; i++) {
    if (mode === "balanced") results.push(generateBalanced(opts));
    else if (mode === "weighted") results.push(generateWeighted(rounds, opts));
    else results.push(generateRandom(opts));
  }
  return results;
}
