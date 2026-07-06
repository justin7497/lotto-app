function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

const COMB_45_6 = comb(45, 6);

/** 한 게임에서 3개 이상 맞출 확률 (5등 이상) */
export function prob3PlusPerGame(): number {
  let p = 0;
  for (let k = 3; k <= 6; k++) {
    p += (comb(6, k) * comb(39, 6 - k)) / COMB_45_6;
  }
  return p;
}

/** N게임 중 최소 1게임 3개 이상 맞출 확률 */
export function probAtLeastOne3Plus(gameCount: number): number {
  if (gameCount <= 0) return 0;
  const p = prob3PlusPerGame();
  return 1 - Math.pow(1 - p, gameCount);
}

export function formatPercent(p: number): string {
  return `${Math.round(p * 1000) / 10}%`;
}
