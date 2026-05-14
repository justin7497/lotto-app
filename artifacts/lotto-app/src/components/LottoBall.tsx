import { motion } from "framer-motion";

interface LottoBallProps {
  number: number;
  size?: "sm" | "md" | "lg" | "xl";
  isBonus?: boolean;
  delay?: number;
  animate?: boolean;
}

function getBallColor(num: number): string {
  if (num <= 10) return "from-yellow-400 to-yellow-500 shadow-yellow-300";
  if (num <= 20) return "from-blue-400 to-blue-500 shadow-blue-300";
  if (num <= 30) return "from-red-400 to-red-500 shadow-red-300";
  if (num <= 40) return "from-gray-500 to-gray-700 shadow-gray-400";
  return "from-green-400 to-green-600 shadow-green-300";
}

function getSizeClasses(size: string): string {
  switch (size) {
    case "sm": return "w-8 h-8 text-xs font-bold";
    case "md": return "w-10 h-10 text-sm font-bold";
    case "lg": return "w-12 h-12 text-base font-bold";
    case "xl": return "w-16 h-16 text-xl font-bold";
    default: return "w-10 h-10 text-sm font-bold";
  }
}

export default function LottoBall({ number, size = "md", isBonus = false, delay = 0, animate = false }: LottoBallProps) {
  const colorClass = getBallColor(number);
  const sizeClass = getSizeClasses(size);

  const ball = (
    <div
      className={`
        ${sizeClass}
        rounded-full bg-gradient-to-br ${colorClass}
        flex items-center justify-center text-white
        shadow-md
        ${isBonus ? "ring-2 ring-amber-400" : ""}
        relative select-none
      `}
    >
      <span className="relative z-10 drop-shadow-sm">{number}</span>
      <div className="absolute top-1.5 left-2 w-2 h-1 bg-white/30 rounded-full rotate-[-30deg]" />
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
