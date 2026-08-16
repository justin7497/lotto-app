/** 빛나는 로또 — 당첨 순간·축하·빛 중심 연출 (함께하는 로또와 캐스트 분리) */

const BASE = "/illustrations";

export const VIVID_POSES = {
  hero: `${BASE}/illust-vivid-hero.png`,
  grid: {
    myLotto: `${BASE}/illust-vivid-my-lotto.png`,
    recommend: `${BASE}/illust-vivid-recommend.png`,
    guide: `${BASE}/illust-vivid-guide.png`,
    settings: `${BASE}/illust-vivid-settings.png`,
  },
  myLotto: {
    ticketQr: `${BASE}/illust-vivid-ticket-qr.png`,
    bulkTicketQr: `${BASE}/illust-vivid-tickets-bulk.png`,
    myWish: `${BASE}/illust-vivid-my-wish.png`,
    myNumbers: `${BASE}/illust-vivid-my-numbers.png`,
    win: `${BASE}/illust-vivid-win.png`,
    slipQr: `${BASE}/illust-vivid-slip-qr.png`,
  },
  recommend: {
    lottoking: `${BASE}/illust-vivid-lottoking.png`,
    saju: `${BASE}/illust-vivid-saju.png`,
    generator: `${BASE}/illust-vivid-generator.png`,
    pick: `${BASE}/illust-vivid-pick.png`,
  },
  guide: {
    recommend: `${BASE}/illust-vivid-guide-recommend.png`,
    save: `${BASE}/illust-vivid-guide-save.png`,
    slip: `${BASE}/illust-vivid-guide-slip.png`,
    win: `${BASE}/illust-vivid-guide-win.png`,
  },
  settings: {
    stats: `${BASE}/illust-vivid-stats.png`,
    notify: `${BASE}/illust-vivid-notify.png`,
    signIn: `${BASE}/illust-vivid-signin.png`,
    signUp: `${BASE}/illust-vivid-signup.png`,
    privacy: `${BASE}/illust-vivid-privacy.png`,
    screenTheme: `${BASE}/illust-vivid-settings.png`,
  },
} as const;

export const HOME_VIVID = {
  hero: VIVID_POSES.hero,
  grid: {
    "mobile-slip": VIVID_POSES.myLotto.slipQr,
    "my-lotto-numbers": VIVID_POSES.grid.myLotto,
    guide: VIVID_POSES.grid.recommend,
    settings: VIVID_POSES.grid.settings,
  },
  popup: {
    ticketQr: VIVID_POSES.myLotto.ticketQr,
    bulkTicketQr: VIVID_POSES.myLotto.bulkTicketQr,
    myWish: VIVID_POSES.myLotto.myWish,
    slipQr: VIVID_POSES.myLotto.slipQr,
    myNumbers: VIVID_POSES.myLotto.myNumbers,
    winNotifications: VIVID_POSES.myLotto.win,
    lottoking: VIVID_POSES.recommend.lottoking,
    saju: VIVID_POSES.recommend.saju,
    generator: VIVID_POSES.recommend.generator,
    pickNumbers: VIVID_POSES.recommend.pick,
    guideRecommend: VIVID_POSES.guide.recommend,
    guideSave: VIVID_POSES.guide.save,
    guideSlip: VIVID_POSES.guide.slip,
    guideWin: VIVID_POSES.guide.win,
    numberStats: VIVID_POSES.settings.stats,
    notifications: VIVID_POSES.settings.notify,
    signIn: VIVID_POSES.settings.signIn,
    signUp: VIVID_POSES.settings.signUp,
    privacy: VIVID_POSES.settings.privacy,
    screenTheme: VIVID_POSES.settings.screenTheme,
  },
} as const;
