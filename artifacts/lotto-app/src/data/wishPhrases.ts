import { AFFIRMATION_CATEGORIES } from "@/data/affirmationData";

export type WishCategoryId =
  | "secret"
  | "subconscious"
  | "having"
  | "christian"
  | "buddhist"
  | "fortune";

export type WishCategory = {
  id: WishCategoryId;
  emoji: string;
  label: string;
  phrases: readonly string[];
};

export const WISH_CATEGORIES: readonly WishCategory[] = AFFIRMATION_CATEGORIES.map((category) => ({
  id: category.id,
  emoji: category.emoji,
  label: category.label,
  phrases: category.affirmations.map((affirmation) => affirmation.content),
}));

export function getWishCategory(id: WishCategoryId) {
  return WISH_CATEGORIES.find((category) => category.id === id);
}

export const WISH_PHRASE_TOTAL = WISH_CATEGORIES.reduce((sum, category) => sum + category.phrases.length, 0);
