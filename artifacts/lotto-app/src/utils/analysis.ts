import type { LottoRound, FrequencyData, SumDistribution, OddEvenData, RecentTrend } from "@/data/types";

export function getNumbers(round: LottoRound): number[] {
  return [round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6];
}

export function getFrequency(rounds: LottoRound[]): FrequencyData[] {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 45; i++) counts[i] = 0;
  const total = rounds.length;
  for (const r of rounds) {
    for (const n of getNumbers(r)) {
      counts[n] = (counts[n] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([num, count]) => ({
      number: Number(num),
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.number - b.number);
}

export function getSumDistribution(rounds: LottoRound[]): SumDistribution[] {
  const ranges: Record<string, number> = {};
  const step = 10;
  for (let i = 70; i < 280; i += step) {
    ranges[`${i}~${i + step - 1}`] = 0;
  }
  for (const r of rounds) {
    const sum = getNumbers(r).reduce((a, b) => a + b, 0);
    const bucket = Math.floor(sum / step) * step;
    const key = `${bucket}~${bucket + step - 1}`;
    ranges[key] = (ranges[key] || 0) + 1;
  }
  return Object.entries(ranges).map(([range, count]) => {
    const [start] = range.split("~").map(Number);
    return { range, count, isHighlight: start >= 110 && start <= 179 };
  });
}

export function getOddEvenRatio(rounds: LottoRound[]): OddEvenData[] {
  const ratios: Record<string, number> = {};
  for (const r of rounds) {
    const nums = getNumbers(r);
    const odd = nums.filter((n) => n % 2 !== 0).length;
    const even = 6 - odd;
    const key = `홀${odd}:짝${even}`;
    ratios[key] = (ratios[key] || 0) + 1;
  }
  const total = rounds.length;
  return Object.entries(ratios)
    .map(([label, count]) => ({
      label,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function getHighLowRatio(rounds: LottoRound[]) {
  const ratios: Record<string, number> = {};
  for (const r of rounds) {
    const nums = getNumbers(r);
    const high = nums.filter((n) => n >= 24).length;
    const low = 6 - high;
    const key = `고${high}:저${low}`;
    ratios[key] = (ratios[key] || 0) + 1;
  }
  const total = rounds.length;
  return Object.entries(ratios)
    .map(([label, count]) => ({
      label,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function getRecentTrend(rounds: LottoRound[], window = 10): RecentTrend[] {
  const sorted = [...rounds].sort((a, b) => b.drwNo - a.drwNo);
  const recent = sorted.slice(0, window);
  const recentNums = new Set<number>();
  const countMap: Record<number, number> = {};
  for (const r of recent) {
    for (const n of getNumbers(r)) {
      recentNums.add(n);
      countMap[n] = (countMap[n] || 0) + 1;
    }
  }

  const lastSeenMap: Record<number, number> = {};
  for (const r of sorted) {
    for (const n of getNumbers(r)) {
      if (lastSeenMap[n] === undefined) lastSeenMap[n] = r.drwNo;
    }
  }

  return Array.from({ length: 45 }, (_, i) => i + 1).map((num) => ({
    number: num,
    lastSeen: lastSeenMap[num] ?? 0,
    appearsInLast10: recentNums.has(num),
    countInLast10: countMap[num] || 0,
  }));
}

export function getStatsSummary(rounds: LottoRound[]) {
  const sums = rounds.map((r) => getNumbers(r).reduce((a, b) => a + b, 0));
  const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
  const freq = getFrequency(rounds);
  const mostFreq = [...freq].sort((a, b) => b.count - a.count).slice(0, 5);
  const leastFreq = [...freq].sort((a, b) => a.count - b.count).slice(0, 5);
  return { avgSum: Math.round(avg), mostFreq, leastFreq };
}
