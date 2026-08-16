import type { HomeThemeAssets } from "./homeThemes";
import { DEFAULT_HOME_THEME_ID, homeThemeAssets } from "./homeThemes";
import { AUTH_UI_VISIBLE } from "@/config/authUi";

export type HomeCategoryId = "mobile-slip" | "my-lotto-numbers" | "guide" | "settings";

export type HomeSubMenuItem =
  | {
      kind: "link";
      label: string;
      image: string;
      desc?: string;
      href?: string;
    }
  | {
      kind: "info";
      label: string;
      desc: string;
      image: string;
    }
  | {
      kind: "sheet";
      sheet: "core-highlights";
      label: string;
      image: string;
      desc?: string;
    };

export type HomeMainGridItem = {
  id: HomeCategoryId;
  label: string;
  image: string;
};

export function settingsCategoryLabel(_isSignedIn: boolean): string {
  return "분석 및 설정";
}

function buildSettingsCoreItems(assets: HomeThemeAssets): HomeSubMenuItem[] {
  const p = assets.popup;
  return [
    {
      kind: "sheet",
      sheet: "core-highlights",
      label: "핵심 사항",
      desc: "티켓 QR 저장·QR 슬립지 발권",
      image: p.ticketQr,
    },
    {
      kind: "link",
      href: "/bulk-ticket-import",
      label: "티켓 일괄 등록",
      desc: "복권 QR 사진 → 나의 번호",
      image: p.bulkTicketQr,
    },
  ];
}

export function buildHomeMainGrid(assets: HomeThemeAssets): HomeMainGridItem[] {
  return [
    { id: "mobile-slip", label: "모바일 슬립지", image: assets.grid["mobile-slip"] },
    { id: "my-lotto-numbers", label: "나의 로또번호", image: assets.grid["my-lotto-numbers"] },
    { id: "guide", label: "번호 만들기", image: assets.grid.guide },
    { id: "settings", label: "분석 및 설정", image: assets.grid.settings },
  ];
}

export function buildRecommendMethodItems(assets: HomeThemeAssets): HomeSubMenuItem[] {
  const p = assets.popup;
  return [
    {
      kind: "link",
      href: "/lottoking",
      label: "행운 · 패턴번호",
      desc: "최근 당첨 흐름 분석",
      image: p.lottoking,
    },
    {
      kind: "link",
      href: "/saju",
      label: "사주 · 행운번호",
      desc: "나와 가족 사주 저장",
      image: p.saju,
    },
    {
      kind: "link",
      href: "/generator",
      label: "스마트 · 8추천",
      desc: "통계·알고리즘",
      image: p.generator,
    },
    {
      kind: "link",
      href: "/slip?edit=1",
      label: "번호 직접 선택",
      desc: "1~45 직접 터치",
      image: p.slipQr,
    },
  ];
}

export function buildHomeCategoryContent(
  assets: HomeThemeAssets,
): Record<HomeCategoryId, { title: string; items: HomeSubMenuItem[] }> {
  const p = assets.popup;
  return {
    "mobile-slip": { title: "모바일 슬립지", items: [] },
    "my-lotto-numbers": { title: "나의 로또번호", items: [] },
    guide: {
      title: "사용 방법",
      items: [
        {
          kind: "info",
          label: "1. 나의 로또번호",
          desc: "저장 번호 관리·티켓 QR 불러오기",
          image: p.guideSave,
        },
        {
          kind: "info",
          label: "2. 번호 만들기",
          desc: "패턴·사주·추천·직접선택 후 저장",
          image: p.guideRecommend,
        },
        {
          kind: "info",
          label: "3. QR 슬립지",
          desc: "저장 번호로 판매점 QR 생성",
          image: p.guideSlip,
        },
        {
          kind: "info",
          label: "4. 당첨 확인",
          desc: "복권 QR 스캔·당첨 결과 보기",
          image: p.guideWin,
        },
      ],
    },
    settings: {
      title: "분석 및 설정",
      items: [],
    },
  };
}

export function buildSettingsGuestItems(assets: HomeThemeAssets): HomeSubMenuItem[] {
  const p = assets.popup;
  const items: HomeSubMenuItem[] = [
    ...buildSettingsCoreItems(assets),
    {
      kind: "link",
      href: "/number-stats",
      label: "번호 통계",
      desc: "출현 빈도·홀짝 분석",
      image: p.numberStats,
    },
    {
      kind: "link",
      href: "/ball-draw",
      label: "추첨 뽑기",
      desc: "공뽑기·돌림판·상자·플링코",
      image: p.pickNumbers,
    },
    {
      kind: "link",
      href: "/my-wish",
      label: "나의 소원",
      desc: "로또 행운 마음가짐·확언",
      image: p.myWish,
    },
    {
      kind: "link",
      href: "/win-notifications",
      label: "로또 전광판",
      desc: "QR 인쇄 확정 번호 당첨 현황",
      image: p.guideWin,
    },
    {
      kind: "link",
      href: "/home-theme",
      label: "화면 테마",
      desc: "홈·메뉴 일러스트 스타일",
      image: p.screenTheme,
    },
    {
      kind: "link",
      href: "/notification-settings",
      label: "알림 설정",
      desc: "추첨·당첨 알림",
      image: p.notifications,
    },
    {
      kind: "link",
      href: "/net-prize",
      label: "실수령액 계산기",
      desc: "당첨금 세금·실수령액",
      image: p.winNotifications,
    },
    ...(AUTH_UI_VISIBLE
      ? ([
          {
            kind: "link",
            href: "/sign-in",
            label: "로그인",
            desc: "백업·알림",
            image: p.signIn,
          },
          {
            kind: "link",
            href: "/sign-up",
            label: "회원가입",
            desc: "새 계정 만들기",
            image: p.signUp,
          },
        ] as HomeSubMenuItem[])
      : []),
    {
      kind: "link",
      href: "/privacy",
      label: "개인정보처리방침",
      desc: "개인정보 안내",
      image: p.privacy,
    },
  ];
  return items;
}

export function buildSettingsSignedInItems(assets: HomeThemeAssets): HomeSubMenuItem[] {
  const p = assets.popup;
  return [
    ...buildSettingsCoreItems(assets),
    {
      kind: "link",
      href: "/number-stats",
      label: "번호 통계",
      desc: "출현 빈도·홀짝 분석",
      image: p.numberStats,
    },
    {
      kind: "link",
      href: "/ball-draw",
      label: "추첨 뽑기",
      desc: "공뽑기·돌림판·상자·플링코",
      image: p.pickNumbers,
    },
    {
      kind: "link",
      href: "/my-wish",
      label: "나의 소원",
      desc: "로또 행운 마음가짐·확언",
      image: p.myWish,
    },
    {
      kind: "link",
      href: "/win-notifications",
      label: "로또 전광판",
      desc: "QR 인쇄 확정 번호 당첨 현황",
      image: p.guideWin,
    },
    {
      kind: "link",
      href: "/home-theme",
      label: "화면 테마",
      desc: "홈·메뉴 일러스트 스타일",
      image: p.screenTheme,
    },
    {
      kind: "link",
      href: "/notification-settings",
      label: "알림 설정",
      desc: "추첨·당첨 알림",
      image: p.notifications,
    },
    {
      kind: "link",
      href: "/net-prize",
      label: "실수령액 계산기",
      desc: "당첨금 세금·실수령액",
      image: p.winNotifications,
    },
    {
      kind: "link",
      href: "/privacy",
      label: "개인정보처리방침",
      desc: "개인정보 안내",
      image: p.privacy,
    },
  ];
}

/** pageHero 등 정적 참조용 — 기본 테마 */
const _defaultAssets = homeThemeAssets(DEFAULT_HOME_THEME_ID);
export const HOME_MAIN_GRID = buildHomeMainGrid(_defaultAssets);
export const HOME_CATEGORY_CONTENT = buildHomeCategoryContent(_defaultAssets);
export const SETTINGS_GUEST_ITEMS = buildSettingsGuestItems(_defaultAssets);
export const SETTINGS_SIGNED_IN_ITEMS = buildSettingsSignedInItems(_defaultAssets);
