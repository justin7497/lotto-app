import type { WinResult } from "@/utils/savedNumbers";

const RANK_STYLE: Record<string, string> = {
  "1": "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm",
  "2": "bg-orange-500 text-white border-orange-600 shadow-sm",
  "3": "bg-purple-600 text-white border-purple-700 shadow-sm",
  "4": "bg-blue-500 text-white border-blue-600 shadow-sm",
  "5": "bg-emerald-500 text-white border-emerald-600 shadow-sm",
};

interface WinBadgeProps {
  result: WinResult;
  className?: string;
}

export default function WinBadge({ result, className = "" }: WinBadgeProps) {
  if (result.rank === null) {
    return (
      <span
        className={`inline-flex items-center text-sm sm:text-base font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 whitespace-normal sm:whitespace-nowrap leading-snug text-center sm:text-left ${className}`}
      >
        {result.label}
      </span>
    );
  }

  const style = RANK_STYLE[String(result.rank)] ?? "bg-gray-200 text-gray-800 border-gray-300";
  return (
    <span
      className={`inline-flex items-center text-sm sm:text-base font-bold border rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 whitespace-normal sm:whitespace-nowrap leading-snug text-center sm:text-left ${style} ${className}`}
    >
      {result.label}
    </span>
  );
}

export function WinPendingBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-sm sm:text-base font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 whitespace-nowrap ${className}`}
    >
      결과 대기 중
    </span>
  );
}
