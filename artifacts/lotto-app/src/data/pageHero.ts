import {
  buildHomeCategoryContent,
  buildRecommendMethodItems,
  buildSettingsGuestItems,
  buildSettingsSignedInItems,
  type HomeSubMenuItem,
} from "@/data/homeMenuData";
import { type HomeThemeAssets, type HomeThemeId, type HomeThemePopupKey, homeThemeAssets } from "@/data/homeThemes";
import { titleForRoute } from "@/data/routeTitles";
import { getStoredHomeThemeId } from "@/utils/homeThemeStorage";

export type PageHeroData = {
  label: string;
  desc: string;
  image: string;
};

function heroFromItem(item: HomeSubMenuItem): PageHeroData | null {
  if (item.kind === "sheet") return null;
  if (item.kind === "link") {
    if (!item.href) return null;
    return {
      label: item.label,
      desc: item.desc ?? "",
      image: item.image,
    };
  }
  return {
    label: item.label,
    desc: item.desc,
    image: item.image,
  };
}

function buildThemeRouteFallbacks(assets: HomeThemeAssets): Map<string, PageHeroData> {
  const p = assets.popup;
  const g = assets.grid;
  const entries: Array<[string, string, string, string]> = [
    ["/slip", "모바일 슬립지", "QR 슬립지 발권", g["mobile-slip"]],
    ["/saved-numbers", "나의 로또번호", "저장 번호 관리", g["my-lotto-numbers"]],
    ["/slip/load-numbers", "나의 로또 번호 불러오기", "슬립지에 번호 불러오기", p.myNumbers],
    ["/slip/load-fixed", "고정번호 불러오기", "고정번호 슬립 불러오기", p.myNumbers],
    ["/slip/add-fixed", "고정번호", "슬립지 고정번호 QR용 번호 만들기", p.myNumbers],
    ["/winning-numbers", "당첨번호 & 당첨금", "회차별 당첨번호·당첨금·판매점", p.guideWin],
    ["/home-theme", "화면 테마", "홈·메뉴 일러스트 스타일", p.screenTheme],
    ["/bulk-ticket-import", "티켓 일괄 등록", "복권 QR 사진 여러 장 → 나의 번호", p.bulkTicketQr],
    ["/admin", "관리자", "관리자 도구", g.settings],
    ["/character-preview", "대표 캐릭터", "복돌이 캐릭터 미리보기", assets.hero],
  ];

  const map = new Map<string, PageHeroData>();
  for (const [href, label, desc, image] of entries) {
    map.set(href, { label, desc, image });
  }
  return map;
}

function buildHeroMap(themeId: HomeThemeId): Map<string, PageHeroData> {
  const assets = homeThemeAssets(themeId);
  const map = new Map<string, PageHeroData>();

  const addItem = (item: HomeSubMenuItem) => {
    const hero = heroFromItem(item);
    if (!hero) return;
    if (item.kind === "link") {
      if (!item.href) return;
      map.set(item.href, hero);
      const pathOnly = item.href.split("?")[0];
      if (!map.has(pathOnly) && !item.href.includes("?")) {
        map.set(pathOnly, hero);
      }
    }
  };

  for (const section of Object.values(buildHomeCategoryContent(assets))) {
    for (const item of section.items) addItem(item);
  }
  for (const item of buildRecommendMethodItems(assets)) addItem(item);
  for (const item of buildSettingsGuestItems(assets)) addItem(item);
  for (const item of buildSettingsSignedInItems(assets)) addItem(item);

  for (const [href, hero] of buildThemeRouteFallbacks(assets)) {
    if (!map.has(href)) map.set(href, hero);
  }

  return map;
}

const heroMapCache = new Map<HomeThemeId, Map<string, PageHeroData>>();

function getHeroMap(): Map<string, PageHeroData> {
  const themeId = getStoredHomeThemeId();
  if (!heroMapCache.has(themeId)) {
    heroMapCache.set(themeId, buildHeroMap(themeId));
  }
  return heroMapCache.get(themeId)!;
}

/** 홈 메뉴에 없는 하위 페이지 — 테마 일러스트로 통일 */
export function heroForRoute(pathname: string, search = ""): PageHeroData | null {
  const HERO_BY_HREF = getHeroMap();
  const base = pathname.split("?")[0];
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const fullKey = qs ? `${base}?${qs}` : base;

  if (HERO_BY_HREF.has(fullKey)) return HERO_BY_HREF.get(fullKey)!;
  if (HERO_BY_HREF.has(base)) return HERO_BY_HREF.get(base)!;

  const assets = homeThemeAssets(getStoredHomeThemeId());
  return {
    label: titleForRoute(pathname, search),
    desc: "",
    image: assets.hero,
  };
}

export function themePopupImage(key: HomeThemePopupKey): string {
  return homeThemeAssets(getStoredHomeThemeId()).popup[key];
}

export function pageHeaderImage(pathname: string, search = ""): string {
  return heroForRoute(pathname, search)?.image ?? homeThemeAssets(getStoredHomeThemeId()).hero;
}

/** 테마 변경 후 하위 페이지 헤더 일러스트 갱신 */
export function invalidatePageHeroCache(): void {
  heroMapCache.clear();
}
