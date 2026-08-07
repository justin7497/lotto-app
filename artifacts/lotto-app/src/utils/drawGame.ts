export const DRAW_BALL_COUNT = 6;

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 1~45 중 중복 없이 6개 */
export function buildLottoDraw(count = DRAW_BALL_COUNT): number[] {
  return shuffle(Array.from({ length: 45 }, (_, i) => i + 1)).slice(0, count);
}
