import { motion } from "framer-motion";
import { getBallGradientClasses } from "@/utils/lottoBallColors";

interface LottoBallProps {
  number: number;
  size?: "sm" | "md" | "lg" | "xl" | "responsive";
  isBonus?: boolean;
  highlight?: boolean;
  delay?: number;
  animate?: boolean;
}

function getSizeClasses(size: string): string {
  switch (size) {
    case "sm":
      return "w-9 h-9 text-sm font-extrabold";
    case "md":
      return "w-11 h-11 text-base font-extrabold";
    case "responsive":
      return "w-9 h-9 sm:w-11 sm:h-11 text-sm sm:text-base font-extrabold";
    case "lg":
      return "w-[3.25rem] h-[3.25rem] text-lg font-extrabold";
    case "xl":
      return "w-[4.5rem] h-[4.5rem] text-2xl font-extrabold";
    default:
      return "w-11 h-11 text-base font-extrabold";
  }
}

export default function LottoBall({
  number,
  size = "md",
  isBonus = false,
  highlight = false,
  delay = 0,
  animate = false,
}: LottoBallProps) {
  const colorClass = getBallGradientClasses(number);
  const sizeClass = getSizeClasses(size);

  const ball = (
    <div
      className={`
        ${sizeClass}
        rounded-full bg-gradient-to-br ${colorClass}
        flex items-center justify-center text-white
        shadow-[0_3px_8px_rgba(0,0,0,0.28)]
        ring-2 ring-white/70
        ${highlight ? "ring-[3px] ring-violet-400 ring-offset-2 ring-offset-white" : ""}
        ${isBonus ? "ring-amber-400 ring-[3px]" : ""}
        relative select-none shrink-0
      `}
    >
      <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">{number}</span>
      <div className="absolute top-[18%] left-[22%] w-[28%] h-[14%] bg-white/35 rounded-full rotate-[-25deg]" />
    </div>
  );

  if (!animate) return ball;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay,
      }}
    >
      {ball}
    </motion.div>
  );
}
