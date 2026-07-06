const STORAGE_KEY = "lotto_favorite_picks_v1";
export const MAX_FAVORITE_PICKS = 20;

export interface FavoritePick {
  id: string;
  name: string;
  numbers: number[];
  savedAt: string;
}

function readAll(): FavoritePick[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as FavoritePick[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeAll(rows: FavoritePick[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function loadFavoritePicks(): FavoritePick[] {
  return readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveFavoritePick(name: string, numbers: number[]): FavoritePick | null {
  if (numbers.length !== 6) return null;
  const unique = new Set(numbers);
  if (unique.size !== 6) return null;
  if (numbers.some((n) => n < 1 || n > 45)) return null;

  const sorted = [...numbers].sort((a, b) => a - b);
  const existing = readAll();
  const dup = existing.some(
    (p) => p.numbers.length === 6 && [...p.numbers].sort((a, b) => a - b).join(",") === sorted.join(","),
  );
  if (dup) return null;

  const pick: FavoritePick = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `단골 ${existing.length + 1}`,
    numbers: sorted,
    savedAt: new Date().toISOString(),
  };

  writeAll([pick, ...existing].slice(0, MAX_FAVORITE_PICKS));
  return pick;
}

export function updateFavoritePick(id: string, name: string, numbers: number[]): boolean {
  if (numbers.length !== 6) return false;
  const unique = new Set(numbers);
  if (unique.size !== 6 || numbers.some((n) => n < 1 || n > 45)) return false;

  const sorted = [...numbers].sort((a, b) => a - b);
  const rows = readAll();
  const idx = rows.findIndex((p) => p.id === id);
  if (idx < 0) return false;

  rows[idx] = {
    ...rows[idx],
    name: name.trim() || rows[idx].name,
    numbers: sorted,
    savedAt: new Date().toISOString(),
  };
  writeAll(rows);
  return true;
}

export function deleteFavoritePick(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}
