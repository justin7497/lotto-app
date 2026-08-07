import { CHARACTER_POSES, HOME_CHARACTER } from "./characterAssets";
import { MASCOT, MASCOT_ASSETS } from "./mascot";
import { HOME_TOGETHER } from "./togetherAssets";
import { HOME_VIVID } from "./vividAssets";

export type HomeThemeId = "sowoni" | "characters" | "together" | "vivid";

export type HomeThemePopupKey =
  | "ticketQr"
  | "myWish"
  | "slipQr"
  | "myNumbers"
  | "winNotifications"
  | "lottoking"
  | "saju"
  | "generator"
  | "pickNumbers"
  | "guideRecommend"
  | "guideSave"
  | "guideSlip"
  | "guideWin"
  | "numberStats"
  | "notifications"
  | "signIn"
  | "signUp"
  | "privacy"
  | "screenTheme";

export type HomeThemeAssets = {
  id: HomeThemeId;
  label: string;
  description: string;
  previewGrid: string;
  hero: string;
  tagline: string;
  grid: {
    "mobile-slip": string;
    "my-lotto-numbers": string;
    guide: string;
    settings: string;
  };
  popup: Record<HomeThemePopupKey, string>;
};

/** 소원이 — 홈 4칸 마스코트 일러스트 */
const SOWONI_THEME: HomeThemeAssets = {
  id: "sowoni",
  label: "소원이",
  description: "밝고 단순한 캐릭터, 한눈에 보기 쉬운 스타일",
  previewGrid: MASCOT_ASSETS.catMyLotto,
  hero: MASCOT_ASSETS.hero,
  tagline: MASCOT.tagline,
  grid: {
    "mobile-slip": MASCOT_ASSETS.catSlip,
    "my-lotto-numbers": MASCOT_ASSETS.catMyLotto,
    guide: MASCOT_ASSETS.catRecommend,
    settings: MASCOT_ASSETS.catSettings,
  },
  popup: {
    ticketQr: MASCOT_ASSETS.catTicketQr,
    myWish: MASCOT_ASSETS.catWish,
    slipQr: MASCOT_ASSETS.catSlip,
    myNumbers: MASCOT_ASSETS.catMyNumbers,
    winNotifications: MASCOT_ASSETS.catPrize,
    lottoking: MASCOT_ASSETS.catLottoking,
    saju: MASCOT_ASSETS.catSaju,
    generator: MASCOT_ASSETS.catGenerator,
    pickNumbers: MASCOT_ASSETS.catPick,
    guideRecommend: MASCOT_ASSETS.catRecommend,
    guideSave: MASCOT_ASSETS.catGuideSave,
    guideSlip: MASCOT_ASSETS.catSlip,
    guideWin: MASCOT_ASSETS.catGuideWin,
    numberStats: MASCOT_ASSETS.catStats,
    notifications: MASCOT_ASSETS.catNotify,
    signIn: MASCOT_ASSETS.catSignIn,
    signUp: MASCOT_ASSETS.catSignUp,
    privacy: MASCOT_ASSETS.catPrivacy,
    screenTheme: MASCOT_ASSETS.catSettings,
  },
};

/** 복가족 로또 — 홈 4칸 부부 일러스트 */
const CHARACTERS_THEME: HomeThemeAssets = {
  id: "characters",
  label: "복가족 로또",
  description: "중장년 부부에게 잘 맞는 편안한 장면 그림",
  previewGrid: HOME_CHARACTER.grid["my-lotto-numbers"],
  hero: HOME_CHARACTER.hero,
  tagline: "오늘도 한 장, 기분 좋게요!",
  grid: { ...HOME_CHARACTER.grid },
  popup: { ...HOME_CHARACTER.popup, screenTheme: CHARACTER_POSES.cloverGrampa.settings },
};

/** 함께하는 로또 — 세대 공감 스마트폰 일러스트 */
const TOGETHER_THEME: HomeThemeAssets = {
  id: "together",
  label: "함께하는 로또",
  description: "가족이 함께 보기 좋은 따뜻한 그림체",
  previewGrid: HOME_TOGETHER.grid["my-lotto-numbers"],
  hero: HOME_TOGETHER.hero,
  tagline: "가족과 함께, 오늘도 한 장!",
  grid: { ...HOME_TOGETHER.grid },
  popup: { ...HOME_TOGETHER.popup },
};

/** 빛나는 로또 — 당첨 순간·축하·빛 중심 연출 (함께하는 로또와 캐스트 분리) */
const VIVID_THEME: HomeThemeAssets = {
  id: "vivid",
  label: "빛나는 로또",
  description: "당첨 순간·축하·빛이 가득한 화려한 그림",
  previewGrid: HOME_VIVID.grid["my-lotto-numbers"],
  hero: HOME_VIVID.hero,
  tagline: "오늘의 행운, 생생하게!",
  grid: { ...HOME_VIVID.grid },
  popup: { ...HOME_VIVID.popup },
};

export const HOME_THEMES: Record<HomeThemeId, HomeThemeAssets> = {
  sowoni: SOWONI_THEME,
  characters: CHARACTERS_THEME,
  together: TOGETHER_THEME,
  vivid: VIVID_THEME,
};

export const HOME_THEME_LIST: HomeThemeAssets[] = [
  TOGETHER_THEME,
  VIVID_THEME,
  CHARACTERS_THEME,
  SOWONI_THEME,
];

export const DEFAULT_HOME_THEME_ID: HomeThemeId = "together";

export function homeThemeAssets(themeId: HomeThemeId): HomeThemeAssets {
  return HOME_THEMES[themeId] ?? HOME_THEMES[DEFAULT_HOME_THEME_ID];
}

export function allThemeImagePaths(themeId: HomeThemeId): string[] {
  const t = homeThemeAssets(themeId);
  const paths = new Set<string>([t.hero, t.previewGrid, ...Object.values(t.grid), ...Object.values(t.popup)]);
  return [...paths];
}

export function allThemesImagePaths(): string[] {
  const paths = new Set<string>();
  for (const id of Object.keys(HOME_THEMES) as HomeThemeId[]) {
    for (const p of allThemeImagePaths(id)) paths.add(p);
  }
  return [...paths];
}
