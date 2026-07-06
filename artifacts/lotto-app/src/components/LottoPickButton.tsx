import { getBallGradientClasses } from "@/utils/lottoBallColors";

interface LottoPickButtonProps {
  number: number;
  selected?: boolean;
  excluded?: boolean;
  onClick: () => void;
  className?: string;
}

export default function LottoPickButton({
  number,
  selected = false,
  excluded = false,
  onClick,
  className = "",
}: LottoPickButtonProps) {
  const gradient = getBallGradientClasses(number);

  if (excluded) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`aspect-square min-h-[40px] rounded-full text-sm font-extrabold transition-all flex items-center justify-center bg-gray-100 text-gray-400 line-through ring-2 ring-red-300 shadow-sm active:scale-95 ${className}`}
      >
        {number}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`aspect-square min-h-[40px] rounded-full bg-gradient-to-br ${gradient} text-sm font-extrabold transition-all flex items-center justify-center text-white shadow-[0_2px_6px_rgba(0,0,0,0.28)] active:scale-95 ${
        selected
          ? "ring-[3px] ring-amber-300 ring-offset-2 scale-105 brightness-110"
          : "ring-2 ring-white/60 hover:brightness-110"
      } ${className}`}
    >
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{number}</span>
    </button>
  );
}
