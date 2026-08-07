import { DEFAULT_HOME_THEME_ID, HOME_THEMES, type HomeThemeId } from "@/data/homeThemes";

/** v3: 기본 테마를 함께하는 로또(together)로 고정 */
const STORAGE_KEY = "sowon-lotto-home-theme-v3";
const LEGACY_STORAGE_KEYS = ["sowon-lotto-home-theme-v2", "sowon-lotto-home-theme"] as const;

function readThemeId(raw: string | null): HomeThemeId | null {
  if (raw && raw in HOME_THEMES) return raw as HomeThemeId;
  return null;
}

export function getStoredHomeThemeId(): HomeThemeId {
  if (typeof window === "undefined") return DEFAULT_HOME_THEME_ID;

  const current = readThemeId(localStorage.getItem(STORAGE_KEY));
  if (current) return current;

  localStorage.setItem(STORAGE_KEY, DEFAULT_HOME_THEME_ID);
  return DEFAULT_HOME_THEME_ID;
}

export function setStoredHomeThemeId(themeId: HomeThemeId): void {
  localStorage.setItem(STORAGE_KEY, themeId);
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  window.dispatchEvent(new CustomEvent("home-theme-change", { detail: themeId }));
}
