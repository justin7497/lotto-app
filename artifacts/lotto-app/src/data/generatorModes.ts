import type { ElementType } from "react";
import {
  Activity,
  Brain,
  FlaskConical,
  Hash,
  LayoutGrid,
  Link2,
  Scale,
  Shuffle,
} from "lucide-react";

export interface GeneratorModeInfo {
  icon: ElementType;
  label: string;
  desc: string;
  guide: string;
  color: string;
  active: string;
  inactive: string;
  tabColor: string;
  badgeColor: string;
}

const NEUTRAL_ACTIVE = "bg-ink text-white border-ink";
const NEUTRAL_INACTIVE =
  "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50";
const NEUTRAL_TAB = "text-gray-800 border-gray-400 bg-gray-50";
const NEUTRAL_BADGE = "bg-gray-100 text-gray-700";
const NEUTRAL_GRADIENT = "from-ink-hover to-ink";

export const MODE_INFO: Record<
  "balanced" | "weighted" | "monte" | "random" | "delta" | "sector" | "tail" | "consecutive",
  GeneratorModeInfo
> = {
  balanced: {
    icon: Scale,
    label: "균형 필터",
    desc: "합계·홀짝·고저 맞춤",
    guide: "합계·홀짝·고저 균형 조합",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  weighted: {
    icon: Brain,
    label: "AI 가중치",
    desc: "최근 고빈도 번호 우선",
    guide: "최근 200회 고빈도 번호 가중",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  monte: {
    icon: FlaskConical,
    label: "몬테카를로",
    desc: "시뮬레이션 상위 조합",
    guide: "대량 시뮬레이션 · 고점수 조합",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  random: {
    icon: Shuffle,
    label: "순수 랜덤",
    desc: "완전 무작위",
    guide: "1~45 무작위 6개",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  delta: {
    icon: Activity,
    label: "델타 시스템",
    desc: "번호 간격 패턴",
    guide: "당첨번호 간격 패턴 반영",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  sector: {
    icon: LayoutGrid,
    label: "구간 분산",
    desc: "구간별 골고루",
    guide: "번호 구간 분산 선택",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  tail: {
    icon: Hash,
    label: "끝수 기반",
    desc: "끝자리 다양",
    guide: "끝자리 중복 최소화",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
  consecutive: {
    icon: Link2,
    label: "연번 기반",
    desc: "연속 번호 포함",
    guide: "연속 번호(예: 7·8) 포함",
    color: NEUTRAL_GRADIENT,
    active: NEUTRAL_ACTIVE,
    inactive: NEUTRAL_INACTIVE,
    tabColor: NEUTRAL_TAB,
    badgeColor: NEUTRAL_BADGE,
  },
};

export type SingleGeneratorMode = keyof typeof MODE_INFO;

export const SINGLE_MODES: SingleGeneratorMode[] = [
  "balanced",
  "weighted",
  "monte",
  "random",
  "delta",
  "sector",
  "tail",
  "consecutive",
];

/** 번호 만들기 탭 기본 노출 (나머지는 더보기) */
export const PRIMARY_MODES: SingleGeneratorMode[] = [
  "balanced",
  "weighted",
  "monte",
  "random",
];

export const EXTRA_MODES: SingleGeneratorMode[] = SINGLE_MODES.filter(
  (mode) => !PRIMARY_MODES.includes(mode),
);

export const BULK_MODES: SingleGeneratorMode[] = [
  "balanced",
  "weighted",
  "monte",
  "delta",
  "sector",
  "tail",
  "consecutive",
];
