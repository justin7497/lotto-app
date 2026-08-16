/** 함께하는 로또 — 한국 가족 3D 일러스트 (메뉴별 로또 배경) */

const BASE = "/illustrations";

export const TOGETHER_POSES = {
  hero: `${BASE}/illust-together-hero.png`,
  grid: {
    myLotto: `${BASE}/illust-together-my-lotto.png`,
    recommend: `${BASE}/illust-together-recommend.png`,
    guide: `${BASE}/illust-together-guide.png`,
    settings: `${BASE}/illust-together-settings.png`,
  },
  myLotto: {
    ticketQr: `${BASE}/illust-together-ticket-qr.png`,
    bulkTicketQr: `${BASE}/illust-together-tickets-bulk.png`,
    myWish: `${BASE}/illust-together-my-wish.png`,
    myNumbers: `${BASE}/illust-together-my-numbers.png`,
    win: `${BASE}/illust-together-win.png`,
    slipQr: `${BASE}/illust-together-slip-qr.png`,
  },
  recommend: {
    lottoking: `${BASE}/illust-together-lottoking.png`,
    saju: `${BASE}/illust-together-saju.png`,
    generator: `${BASE}/illust-together-generator.png`,
    pick: `${BASE}/illust-together-pick.png`,
  },
  guide: {
    recommend: `${BASE}/illust-together-guide-recommend.png`,
    save: `${BASE}/illust-together-guide-save.png`,
    slip: `${BASE}/illust-together-guide-slip.png`,
    win: `${BASE}/illust-together-guide-win.png`,
  },
  settings: {
    stats: `${BASE}/illust-together-stats.png`,
    notify: `${BASE}/illust-together-notify.png`,
    signIn: `${BASE}/illust-together-signin.png`,
    signUp: `${BASE}/illust-together-signup.png`,
    privacy: `${BASE}/illust-together-privacy.png`,
    screenTheme: `${BASE}/illust-together-settings.png`,
  },
} as const;

export const HOME_TOGETHER = {
  hero: TOGETHER_POSES.hero,
  grid: {
    "mobile-slip": TOGETHER_POSES.myLotto.slipQr,
    "my-lotto-numbers": TOGETHER_POSES.grid.myLotto,
    guide: TOGETHER_POSES.grid.recommend,
    settings: TOGETHER_POSES.grid.settings,
  },
  popup: {
    ticketQr: TOGETHER_POSES.myLotto.ticketQr,
    bulkTicketQr: TOGETHER_POSES.myLotto.bulkTicketQr,
    myWish: TOGETHER_POSES.myLotto.myWish,
    slipQr: TOGETHER_POSES.myLotto.slipQr,
    myNumbers: TOGETHER_POSES.myLotto.myNumbers,
    winNotifications: TOGETHER_POSES.myLotto.win,
    lottoking: TOGETHER_POSES.recommend.lottoking,
    saju: TOGETHER_POSES.recommend.saju,
    generator: TOGETHER_POSES.recommend.generator,
    pickNumbers: TOGETHER_POSES.recommend.pick,
    guideRecommend: TOGETHER_POSES.guide.recommend,
    guideSave: TOGETHER_POSES.guide.save,
    guideSlip: TOGETHER_POSES.guide.slip,
    guideWin: TOGETHER_POSES.guide.win,
    numberStats: TOGETHER_POSES.settings.stats,
    notifications: TOGETHER_POSES.settings.notify,
    signIn: TOGETHER_POSES.settings.signIn,
    signUp: TOGETHER_POSES.settings.signUp,
    privacy: TOGETHER_POSES.settings.privacy,
    screenTheme: TOGETHER_POSES.settings.screenTheme,
  },
} as const;

export function allTogetherPoseImages(): string[] {
  const paths = new Set<string>();
  for (const group of Object.values(TOGETHER_POSES)) {
    if (typeof group === "string") {
      paths.add(group);
      continue;
    }
    for (const src of Object.values(group)) paths.add(src);
  }
  return [...paths];
}
