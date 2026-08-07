import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HOME_THEME_ID,
  HOME_THEMES,
  homeThemeAssets,
  type HomeThemeId,
} from "@/data/homeThemes";
import {
  buildHomeCategoryContent,
  buildHomeMainGrid,
  buildRecommendMethodItems,
  buildSettingsGuestItems,
  buildSettingsSignedInItems,
  type HomeCategoryId,
} from "@/data/homeMenuData";
import { getStoredHomeThemeId, setStoredHomeThemeId } from "@/utils/homeThemeStorage";
import { invalidatePageHeroCache } from "@/data/pageHero";

type HomeThemeContextValue = {
  themeId: HomeThemeId;
  setThemeId: (id: HomeThemeId) => void;
  heroImage: string;
  tagline: string;
  mainGrid: ReturnType<typeof buildHomeMainGrid>;
  categoryContent: ReturnType<typeof buildHomeCategoryContent>;
  settingsGuestItems: ReturnType<typeof buildSettingsGuestItems>;
  settingsSignedInItems: ReturnType<typeof buildSettingsSignedInItems>;
  recommendMethodItems: ReturnType<typeof buildRecommendMethodItems>;
};

const HomeThemeContext = createContext<HomeThemeContextValue | null>(null);

export function HomeThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<HomeThemeId>(() => getStoredHomeThemeId());

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<HomeThemeId>).detail;
      if (next && next in HOME_THEMES) setThemeIdState(next);
    };
    window.addEventListener("home-theme-change", onChange);
    return () => window.removeEventListener("home-theme-change", onChange);
  }, []);

  const setThemeId = useCallback((id: HomeThemeId) => {
    setStoredHomeThemeId(id);
    invalidatePageHeroCache();
    setThemeIdState(id);
  }, []);

  const assets = useMemo(() => homeThemeAssets(themeId), [themeId]);

  const value = useMemo<HomeThemeContextValue>(
    () => ({
      themeId,
      setThemeId,
      heroImage: assets.hero,
      tagline: assets.tagline,
      mainGrid: buildHomeMainGrid(assets),
      categoryContent: buildHomeCategoryContent(assets),
      settingsGuestItems: buildSettingsGuestItems(assets),
      settingsSignedInItems: buildSettingsSignedInItems(assets),
      recommendMethodItems: buildRecommendMethodItems(assets),
    }),
    [themeId, setThemeId, assets],
  );

  return <HomeThemeContext.Provider value={value}>{children}</HomeThemeContext.Provider>;
}

export function useHomeTheme(): HomeThemeContextValue {
  const ctx = useContext(HomeThemeContext);
  if (!ctx) {
    const assets = homeThemeAssets(DEFAULT_HOME_THEME_ID);
    return {
      themeId: DEFAULT_HOME_THEME_ID,
      setThemeId: () => {},
      heroImage: assets.hero,
      tagline: assets.tagline,
      mainGrid: buildHomeMainGrid(assets),
      categoryContent: buildHomeCategoryContent(assets),
      settingsGuestItems: buildSettingsGuestItems(assets),
      settingsSignedInItems: buildSettingsSignedInItems(assets),
      recommendMethodItems: buildRecommendMethodItems(assets),
    };
  }
  return ctx;
}

export function useHomeCategoryContent(categoryId: HomeCategoryId | null) {
  const { categoryContent } = useHomeTheme();
  return categoryId ? categoryContent[categoryId] : null;
}
