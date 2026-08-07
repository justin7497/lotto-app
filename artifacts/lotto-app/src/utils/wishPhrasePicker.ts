function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function randomPhraseCount(): number {
  return Math.floor(Math.random() * 3) + 3;
}

export function pickWishPhrases(
  phrases: readonly string[],
  count = randomPhraseCount(),
  exclude: readonly string[] = [],
): string[] {
  if (phrases.length === 0) return [];

  const excludeSet = new Set(exclude);
  let pool = shuffle(phrases.filter((p) => !excludeSet.has(p)));
  if (pool.length < count) {
    pool = shuffle([...phrases]);
  }

  return pool.slice(0, Math.min(count, pool.length));
}
