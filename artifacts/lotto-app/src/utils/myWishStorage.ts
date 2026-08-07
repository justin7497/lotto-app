const STORAGE_KEY = "lotto_my_wishes_v1";
export const MAX_WISHES_PER_CATEGORY = 50;
const MAX_LENGTH = 120;
export interface MyWish {
  id: string;
  text: string;
  title?: string;
  createdAt: string;
  source?: "preset" | "custom";
  categoryId?: string;
  affirmationId?: string;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadMyWishes(): MyWish[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (row): row is MyWish =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as MyWish).id === "string" &&
          typeof (row as MyWish).text === "string" &&
          typeof (row as MyWish).createdAt === "string",
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function countWishesInCategory(wishes: MyWish[], categoryId: string): number {
  return wishes.filter((wish) => wish.categoryId === categoryId).length;
}

function persist(wishes: MyWish[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
}
export function saveMyWish(
  text: string,
  meta?: {
    source?: "preset" | "custom";
    categoryId?: string;
    title?: string;
    affirmationId?: string;
  },
): { ok: true; wish: MyWish } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "확언을 선택해 주세요." };
  }
  if (trimmed.length > MAX_LENGTH) {
    return { ok: false, error: `확언은 ${MAX_LENGTH}자까지 저장할 수 있습니다.` };
  }

  const existing = loadMyWishes();
  if (meta?.categoryId) {
    const categoryCount = countWishesInCategory(existing, meta.categoryId);
    if (categoryCount >= MAX_WISHES_PER_CATEGORY) {
      return {
        ok: false,
        error: `이 카테고리는 최대 ${MAX_WISHES_PER_CATEGORY}개까지 저장할 수 있습니다.`,
      };
    }
  }

  const wish: MyWish = {
    id: newId(),
    text: trimmed,
    createdAt: new Date().toISOString(),
    ...(meta?.source ? { source: meta.source } : {}),
    ...(meta?.categoryId ? { categoryId: meta.categoryId } : {}),
    ...(meta?.title ? { title: meta.title } : {}),
    ...(meta?.affirmationId ? { affirmationId: meta.affirmationId } : {}),
  };
  const next = [wish, ...existing];
  persist(next);
  return { ok: true, wish };
}

export function deleteMyWish(id: string): void {
  persist(loadMyWishes().filter((w) => w.id !== id));
}

export function clearMyWishes(): void {
  localStorage.removeItem(STORAGE_KEY);
}
