/** 구간별 5색 — 로또 공식 구간 */

import type { CSSProperties } from "react";

export type LottoBallTier = "yellow" | "blue" | "red" | "gray" | "green";
export type LottoBallVariant = "flat" | "gloss";

export function getLottoBallTier(n: number): LottoBallTier {
  if (n <= 10) return "yellow";
  if (n <= 20) return "blue";
  if (n <= 30) return "red";
  if (n <= 40) return "gray";
  return "green";
}

/** 무광 단색 (당첨 확인·홈 공통) */
export function getBallFlatColor(n: number): string {
  switch (getLottoBallTier(n)) {
    case "yellow":
      return "#fbc400";
    case "blue":
      return "#69c8f2";
    case "red":
      return "#ff7272";
    case "gray":
      return "#8a8a8a";
    case "green":
      return "#b0d840";
  }
}

export const BALL_MUTED_BG = "#e8e8e8";
export const BALL_MUTED_FG = "#9ca3af";

export function getBallSolidColor(n: number): string {
  return getBallFlatColor(n);
}

export function getBallTextClass(n: number): string {
  return getLottoBallTier(n) === "yellow" ? "text-[#1a1a1a]" : "text-white";
}

/** 단색 공 스타일 — 그라데이션·음영 없음 */
export function getBallSphereStyle(n: number, muted = false): CSSProperties {
  if (muted) {
    return {
      background: BALL_MUTED_BG,
      color: BALL_MUTED_FG,
      boxShadow: "none",
      textShadow: "none",
    };
  }
  return {
    background: getBallFlatColor(n),
    color: n <= 10 ? "#1a1a1a" : "#ffffff",
    boxShadow: "none",
    textShadow: "none",
  };
}

/** @deprecated */
export function getBallGradientClasses(n: number): string {
  switch (getLottoBallTier(n)) {
    case "yellow":
      return "from-[#fbc400] to-[#fbc400]";
    case "blue":
      return "from-[#69c8f2] to-[#69c8f2]";
    case "red":
      return "from-[#ff7272] to-[#ff7272]";
    case "gray":
      return "from-[#8a8a8a] to-[#8a8a8a]";
    case "green":
      return "from-[#b0d840] to-[#b0d840]";
  }
}
