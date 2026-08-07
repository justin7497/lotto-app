/** 복가족 로또 — 메뉴별 포즈 일러스트 */

export const CHARACTER_POSES = {
  bokdori: {
    hero: "/illustrations/illust-bokdori-hero.png",
    ticketQr: "/illustrations/illust-pose-bokdori-ticket-qr.png",
    slipQr: "/illustrations/illust-pose-bokdori-slip-qr.png",
    signIn: "/illustrations/illust-pose-bokdori-signin.png",
  },
  family: {
    myLotto: "/illustrations/illust-pose-family-my-lotto.png",
    myNumbers: "/illustrations/illust-pose-family-my-numbers.png",
    signUp: "/illustrations/illust-pose-family-signup.png",
    save: "/illustrations/illust-pose-family-save.png",
  },
  haengi: {
    recommend: "/illustrations/illust-pose-haengi-recommend.png",
    generator: "/illustrations/illust-pose-haengi-generator.png",
    pick: "/illustrations/illust-ball-draw.png",
  },
  boksoon: {
    guide: "/illustrations/illust-pose-boksoon-guide.png",
    win: "/illustrations/illust-pose-boksoon-win.png",
    notify: "/illustrations/illust-pose-boksoon-notify.png",
  },
  cloverGrampa: {
    settings: "/illustrations/illust-pose-clover-settings.png",
    saju: "/illustrations/illust-pose-clover-saju.png",
    stats: "/illustrations/illust-pose-clover-stats.png",
  },
  bokhak: {
    wish: "/illustrations/illust-pose-bokhak-wish.png",
    privacy: "/illustrations/illust-pose-bokhak-privacy.png",
  },
} as const;

/**
 * 홈·팝업 캐릭터 배치 (복가족 부부 일러스트)
 * - 히어로: 복가족 부부
 * - 메인 4칸: 슬립지 · 나의번호 · 번호만들기 · 분석설정
 */
export const HOME_CHARACTER = {
  hero: CHARACTER_POSES.bokdori.hero,
  grid: {
    "mobile-slip": CHARACTER_POSES.bokdori.slipQr,
    "my-lotto-numbers": CHARACTER_POSES.family.myLotto,
    guide: CHARACTER_POSES.haengi.recommend,
    settings: CHARACTER_POSES.cloverGrampa.settings,
  },
  popup: {
    ticketQr: CHARACTER_POSES.bokdori.ticketQr,
    myWish: CHARACTER_POSES.bokhak.wish,
    slipQr: CHARACTER_POSES.bokdori.slipQr,
    myNumbers: CHARACTER_POSES.family.myNumbers,
    winNotifications: CHARACTER_POSES.boksoon.win,
    lottoking: CHARACTER_POSES.bokhak.wish,
    saju: CHARACTER_POSES.cloverGrampa.saju,
    generator: CHARACTER_POSES.haengi.generator,
    pickNumbers: CHARACTER_POSES.haengi.pick,
    guideRecommend: CHARACTER_POSES.haengi.recommend,
    guideSave: CHARACTER_POSES.family.save,
    guideSlip: CHARACTER_POSES.bokdori.slipQr,
    guideWin: CHARACTER_POSES.boksoon.win,
    numberStats: CHARACTER_POSES.cloverGrampa.stats,
    notifications: CHARACTER_POSES.boksoon.notify,
    signIn: CHARACTER_POSES.bokdori.signIn,
    signUp: CHARACTER_POSES.family.signUp,
    privacy: CHARACTER_POSES.bokhak.privacy,
  },
} as const;

/** 프리로드·미리보기용 전체 포즈 경로 */
export function allCharacterPoseImages(): string[] {
  const paths = new Set<string>();
  for (const group of Object.values(CHARACTER_POSES)) {
    for (const src of Object.values(group)) paths.add(src);
  }
  return [...paths];
}
