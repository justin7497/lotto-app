import {
  AFFIRMATION_CATEGORIES,
  flattenAffirmations,
  type AffirmationCategoryId,
  type SelectedAffirmation,
} from "@/data/affirmationData";

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function pickRandomAffirmation(
  categoryId?: AffirmationCategoryId,
  excludeId?: string,
): SelectedAffirmation {
  const pool = categoryId
    ? flattenAffirmations().filter((item) => item.categoryId === categoryId)
    : flattenAffirmations();
  const candidates = excludeId ? pool.filter((item) => item.id !== excludeId) : pool;
  const source = candidates.length > 0 ? candidates : pool;
  return shuffle(source)[0]!;
}

export function getCategoryAffirmations(categoryId: AffirmationCategoryId): SelectedAffirmation[] {
  const category = AFFIRMATION_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return [];
  return category.affirmations.map((affirmation) => ({
    ...affirmation,
    categoryId: category.id,
    categoryLabel: category.label,
    categoryEmoji: category.emoji,
    keywords: category.keywords,
  }));
}
