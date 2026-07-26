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
import type { GeneratorMode } from "@/data/types";

export const SINGLE_MODES = [
  "balanced",
  "weighted",
  "monte",
  "random",
  "delta",
  "sector",
  "tail",
  "consecutive",
] as const;

export type SingleGeneratorMode = (typeof SINGLE_MODES)[number];

export const BULK_MODES: SingleGeneratorMode[] = [
  "balanced",
  "weighted",
  "monte",
  "delta",
  "sector",
  "tail",
  "consecutive",
];

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

export const MODE_INFO: Record<SingleGeneratorMode, GeneratorModeInfo> = {
  balanced: {
    icon: Scale,
    label: "균형 필터",
    desc: "합계·홀짝·고저 비율 최적화",
    guide:
      "역대 당첨 패턴에서 자주 나온 조건을 만족하는 조합만 골라냅니다. 번호 합계 110~180, 홀수 2~4개, 24 이상 고번호 1~5개 범위를 맞춥니다.",
    color: "from-emerald-400 to-emerald-600",
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400",
    tabColor: "text-emerald-600 border-emerald-500 bg-emerald-50",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  weighted: {
    icon: Brain,
    label: "AI 가중치",
    desc: "최근 200회 빈도 높은 번호 우선",
    guide:
      "최근 200회 당첨 데이터에서 자주 나온 번호에 가중치를 둡니다. 출현 빈도가 높은 번호가 조합에 포함될 확률이 높아집니다.",
    color: "from-violet-400 to-violet-600",
    active: "bg-violet-500 text-white border-violet-500",
    inactive: "bg-white text-violet-600 border-violet-200 hover:border-violet-400",
    tabColor: "text-violet-600 border-violet-500 bg-violet-50",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  monte: {
    icon: FlaskConical,
    label: "몬테카를로",
    desc: "15만 회 시뮬레이션 최상위 조합",
    guide:
      "15만 번 무작위 조합을 시뮬레이션한 뒤, 합계·홀짝·AC값·빈도 점수가 높은 상위 조합을 추출합니다. 생성에 1~2초 걸릴 수 있습니다.",
    color: "from-amber-400 to-orange-500",
    active: "bg-amber-500 text-white border-amber-500",
    inactive: "bg-white text-amber-600 border-amber-200 hover:border-amber-400",
    tabColor: "text-amber-600 border-amber-500 bg-amber-50",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  random: {
    icon: Shuffle,
    label: "순수 랜덤",
    desc: "완전한 무작위 추첨",
    guide: "1~45 중 6개를 완전 무작위로 뽑습니다. 통계·필터 조건을 적용하지 않는 가장 단순한 방식입니다.",
    color: "from-rose-400 to-rose-600",
    active: "bg-rose-500 text-white border-rose-500",
    inactive: "bg-white text-rose-600 border-rose-200 hover:border-rose-400",
    tabColor: "text-rose-600 border-rose-500 bg-rose-50",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  delta: {
    icon: Activity,
    label: "델타 시스템",
    desc: "역대 번호 간격 패턴 기반 생성",
    guide:
      "역대 당첨 번호 사이 간격(델타) 패턴을 참고합니다. 최근 회차와 비슷한 번호 간격 구조를 가진 조합을 만듭니다.",
    color: "from-teal-400 to-cyan-500",
    active: "bg-teal-500 text-white border-teal-500",
    inactive: "bg-white text-teal-600 border-teal-200 hover:border-teal-400",
    tabColor: "text-teal-600 border-teal-500 bg-teal-50",
    badgeColor: "bg-teal-100 text-teal-700",
  },
  sector: {
    icon: LayoutGrid,
    label: "구간 분산",
    desc: "5개 구간 골고루 1개 이상 선택",
    guide:
      "1~9, 10~19, 20~29, 30~39, 40~45 다섯 구간에서 각각 최소 1개 이상 번호가 오도록 분산합니다. 한쪽 구간에만 몰리지 않게 합니다.",
    color: "from-sky-400 to-blue-500",
    active: "bg-sky-500 text-white border-sky-500",
    inactive: "bg-white text-sky-600 border-sky-200 hover:border-sky-400",
    tabColor: "text-sky-600 border-sky-500 bg-sky-50",
    badgeColor: "bg-sky-100 text-sky-700",
  },
  tail: {
    icon: Hash,
    label: "끝수 기반",
    desc: "끝자리 최대 다양성 조합 구성",
    guide:
      "6개 번호의 일의 자리(끝수)가 최대한 다양하게 섞이도록 조합합니다. 같은 끝수가 반복되지 않게 분산합니다.",
    color: "from-pink-400 to-fuchsia-500",
    active: "bg-pink-500 text-white border-pink-500",
    inactive: "bg-white text-pink-600 border-pink-200 hover:border-pink-400",
    tabColor: "text-pink-600 border-pink-500 bg-pink-50",
    badgeColor: "bg-pink-100 text-pink-700",
  },
  consecutive: {
    icon: Link2,
    label: "연번 기반",
    desc: "연속 번호 쌍 1개 이상 포함",
    guide:
      "7·8처럼 연속된 번호 쌍이 최소 1개 포함된 조합을 만듭니다. 역대 당첨번호 상당수에 연번이 포함된다는 통계를 반영합니다.",
    color: "from-lime-400 to-green-500",
    active: "bg-lime-500 text-white border-lime-500",
    inactive: "bg-white text-lime-600 border-lime-200 hover:border-lime-400",
    tabColor: "text-lime-600 border-lime-500 bg-lime-50",
    badgeColor: "bg-lime-100 text-lime-700",
  },
};

