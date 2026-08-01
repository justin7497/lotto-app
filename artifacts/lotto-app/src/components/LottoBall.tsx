import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import {
  getBallSphereStyle,
  getBallTextClass,
  getLottoBallTier,
  type LottoBallVariant,
} from "@/utils/lottoBallColors";

interface LottoBallProps {
  number: number;
  size?: "sm" | "md" | "lg" | "xl" | "hero" | "responsive";
  variant?: LottoBallVariant;
  /** 당첨번호 상단 — 글로우·쉬머·등장 애니메이션 */
  dramatic?: boolean;
  isBonus?: boolean;
  /** 당첨번호와 일치 여부 — false면 회색 공 */
  matched?: boolean | null;
  /** @deprecated matched 사용 */
  highlight?: boolean;
  delay?: number;
  animate?: boolean;
}

/** 지름 대비 숫자 ≈ 70% — sm은 CSS에서 좁은 화면 맞춤 확대 */
const SIZE: Record<string, { w: number; font: number }> = {
  sm: { w: 36, font: 26 },
  md: { w: 46, font: 32 },
  responsive: { w: 46, font: 32 },
  lg: { w: 50, font: 35 },
  hero: { w: 44, font: 31 },
  xl: { w: 66, font: 46 },
};

export default function LottoBall({
  number,
  size = "md",
  variant = "flat",
  dramatic = false,
  isBonus = false,
  matched = null,
  highlight = false,
  delay = 0,
  animate = false,
}: LottoBallProps) {
  const dim = SIZE[size] ?? SIZE.md;
  const muted = matched === false;
  const isGloss = variant === "gloss";
  const tier = getLottoBallTier(number);
  const sphereStyle = isGloss ? {} : getBallSphereStyle(number, muted);
  const textClass = isGloss
    ? muted
      ? "lotto-ball__num--light"
      : tier === "yellow"
        ? "lotto-ball__num--dark"
        : "lotto-ball__num--light"
    : muted
      ? "text-white"
      : getBallTextClass(number);

  const style: CSSProperties = {
    ...sphereStyle,
    width: dim.w,
    height: dim.w,
    fontSize: dim.font,
    fontWeight: 900,
    lineHeight: 1,
  };

  const tierClass = muted ? "muted" : tier;
  const shouldAnimate = animate || dramatic;

  const ballFace = (
    <div
      className={`
        lotto-ball lotto-ball--${size}
        ${isGloss ? `lotto-ball--gloss lotto-ball--tier-${tierClass}` : textClass}
        rounded-full
        flex items-center justify-center
        relative select-none shrink-0
        ${highlight && matched !== false ? "outline outline-[2px] outline-offset-1 outline-gray-500/70" : ""}
        ${isBonus && !isGloss ? "ring-2 ring-gray-500/60 ring-offset-1" : ""}
        ${isBonus && isGloss ? "lotto-ball--bonus" : ""}
      `}
      style={style}
      data-ball-tier={isGloss ? tierClass : undefined}
    >
      {isGloss ? (
        <>
          <span className="lotto-ball__halo" aria-hidden />
          <span className="lotto-ball__sheen" aria-hidden />
          <span className="lotto-ball__glint" aria-hidden />
          <span className="lotto-ball__rim" aria-hidden />
        </>
      ) : null}
      <span
        className={`lotto-ball__num relative z-10 tabular-nums tracking-tighter translate-y-[0.5px] ${isGloss ? textClass : ""}`}
      >
        {number}
      </span>
    </div>
  );

  const ball = isGloss ? (
    <div
      className={`lotto-ball__stage lotto-ball--tier-${tierClass}${dramatic ? " lotto-ball__stage--dramatic" : ""}${isBonus ? " lotto-ball__stage--bonus" : ""}`}
    >
      {ballFace}
    </div>
  ) : (
    ballFace
  );

  if (!shouldAnimate) return ball;

  return (
    <motion.div
      className="inline-flex shrink-0"
      initial={
        dramatic
          ? { scale: 0.35, y: 28, opacity: 0, rotate: -12 }
          : { scale: 0, rotate: -180, opacity: 0 }
      }
      animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: dramatic ? 420 : 300,
        damping: dramatic ? 16 : 20,
        delay,
      }}
    >
      {ball}
    </motion.div>
  );
}
