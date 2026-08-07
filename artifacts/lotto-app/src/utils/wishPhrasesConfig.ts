import { doc, getDoc } from "firebase/firestore";
import { WISH_CATEGORIES, type WishCategory } from "@/data/wishPhrases";
import { db } from "@/lib/firebase";

let cache: WishCategory[] | null = null;

function normalizeCategories(raw: unknown): WishCategory[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const categories: WishCategory[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<WishCategory>;
    if (!row.id || !row.label || !Array.isArray(row.phrases) || row.phrases.length === 0) continue;
    categories.push({
      id: row.id,
      emoji: row.emoji ?? "✨",
      label: row.label,
      phrases: row.phrases.filter((p): p is string => typeof p === "string" && p.trim().length > 0),
    });
  }
  return categories.length > 0 ? categories : null;
}

export async function loadWishCategories(): Promise<WishCategory[]> {
  if (cache) return cache;

  if (!db) {
    cache = [...WISH_CATEGORIES];
    return cache;
  }

  try {
    const snap = await getDoc(doc(db, "appConfig", "wishPhrases"));
    if (snap.exists()) {
      const remote = normalizeCategories(snap.data()?.categories);
      if (remote) {
        cache = remote;
        return cache;
      }
    }
  } catch {
    // Firestore 미설정·오프라인 시 기본 문구 사용
  }

  cache = [...WISH_CATEGORIES];
  return cache;
}

export function clearWishCategoriesCache(): void {
  cache = null;
}

export function countWishPhrases(categories: readonly WishCategory[]): number {
  return categories.reduce((sum, category) => sum + category.phrases.length, 0);
}
