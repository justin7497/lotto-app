export type DrawModeId = "machine" | "roulette" | "box" | "plinko";

export type DrawModeItem = {
  id: DrawModeId;
  href: string;
  label: string;
  tagline: string;
  description: string;
  previewImage: string;
  previewClass: string;
};

export const DRAW_MODE_LIST: DrawModeItem[] = [
  {
    id: "machine",
    href: "/ball-draw/machine",
    label: "공뽑기",
    tagline: "추첨기처럼 하나씩!",
    description: "공을 섞고 하나씩 뽑는 진짜 추첨 느낌",
    previewImage: "/illustrations/illust-ball-draw.png",
    previewClass: "draw-mode-settings__preview--machine",
  },
  {
    id: "roulette",
    href: "/ball-draw/roulette",
    label: "돌림판",
    tagline: "휙 돌려서 한 판!",
    description: "행운의 돌림판이 번호를 골라 줍니다",
    previewImage: "/illustrations/illust-draw-roulette.png",
    previewClass: "draw-mode-settings__preview--roulette",
  },
  {
    id: "box",
    href: "/ball-draw/box",
    label: "행운 상자",
    tagline: "탭 한 번, 오늘의 운!",
    description: "상자를 열면 행운 번호가 나타납니다",
    previewImage: "/illustrations/illust-draw-lucky-box.png",
    previewClass: "draw-mode-settings__preview--box",
  },
  {
    id: "plinko",
    href: "/ball-draw/plinko",
    label: "행운의 길",
    tagline: "공이 떨어지며 결정!",
    description: "핀을 타고 내려오는 플링코 뽑기",
    previewImage: "/illustrations/illust-draw-plinko.png",
    previewClass: "draw-mode-settings__preview--plinko",
  },
];

export const DEFAULT_DRAW_MODE_ID: DrawModeId = "machine";

export function drawModeByPath(pathname: string): DrawModeItem | undefined {
  const base = pathname.split("?")[0];
  return DRAW_MODE_LIST.find((m) => m.href === base);
}
