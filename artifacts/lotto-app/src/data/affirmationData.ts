import { AFFIRMATION_CATALOG } from "./affirmationCatalog";

export type AffirmationCategoryId =
  | "secret"
  | "subconscious"
  | "having"
  | "christian"
  | "buddhist"
  | "fortune";

export type AffirmationItem = {
  id: string;
  title: string;
  content: string;
};

export type AffirmationCategory = {
  id: AffirmationCategoryId;
  emoji: string;
  label: string;
  keywords: readonly string[];
  affirmations: readonly AffirmationItem[];
};

const CATEGORY_META: Record<
  AffirmationCategoryId,
  Pick<AffirmationCategory, "emoji" | "label" | "keywords">
> = {
  secret: {
    emoji: "✨",
    label: "끌어당김·마음",
    keywords: ["#현재완료", "#상상", "#풍요의에너지"],
  },
  subconscious: {
    emoji: "🌙",
    label: "잠재의식·마음",
    keywords: ["#수면전루틴", "#무한한부", "#자격인정"],
  },
  having: {
    emoji: "💫",
    label: "있음·감사",
    keywords: ["#있음에집착", "#결핍해소", "#감사"],
  },
  christian: {
    emoji: "✝️",
    label: "마음가짐·기도",
    keywords: ["#선한영향력", "#청지기", "#은혜"],
  },
  buddhist: {
    emoji: "🪷",
    label: "공덕·회향",
    keywords: ["#복덕", "#보시", "#지혜와집착배제"],
  },
  fortune: {
    emoji: "🍀",
    label: "전통·재운",
    keywords: ["#재운개통", "#천운", "#미리감사"],
  },
};

function mapAffirmations(
  categoryId: AffirmationCategoryId,
): readonly AffirmationItem[] {
  return AFFIRMATION_CATALOG[categoryId].map((phrase, index) => ({
    id: `${categoryId}-${index + 1}`,
    title: phrase.title,
    content: phrase.content,
  }));
}

export const AFFIRMATION_CATEGORIES: readonly AffirmationCategory[] = (
  Object.keys(CATEGORY_META) as AffirmationCategoryId[]
).map((id) => ({
  id,
  ...CATEGORY_META[id],
  affirmations: mapAffirmations(id),
}));

export type SelectedAffirmation = AffirmationItem & {
  categoryId: AffirmationCategoryId;
  categoryLabel: string;
  categoryEmoji: string;
  keywords: readonly string[];
};

export function getAffirmationCategory(id: AffirmationCategoryId): AffirmationCategory | undefined {
  return AFFIRMATION_CATEGORIES.find((category) => category.id === id);
}

export function flattenAffirmations(): SelectedAffirmation[] {
  return AFFIRMATION_CATEGORIES.flatMap((category) =>
    category.affirmations.map((affirmation) => ({
      ...affirmation,
      categoryId: category.id,
      categoryLabel: category.label,
      categoryEmoji: category.emoji,
      keywords: category.keywords,
    })),
  );
}

export function toSelectedAffirmation(
  categoryId: AffirmationCategoryId,
  affirmationId: string,
): SelectedAffirmation | undefined {
  const category = getAffirmationCategory(categoryId);
  if (!category) return undefined;
  const affirmation = category.affirmations.find((item) => item.id === affirmationId);
  if (!affirmation) return undefined;
  return {
    ...affirmation,
    categoryId: category.id,
    categoryLabel: category.label,
    categoryEmoji: category.emoji,
    keywords: category.keywords,
  };
}

export const AFFIRMATION_TOTAL = flattenAffirmations().length;
