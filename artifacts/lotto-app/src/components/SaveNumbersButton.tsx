import { Bookmark, CheckCircle2, Loader2 } from "lucide-react";
import { getRoundTag, parseRoundNo } from "@/utils/savedNumbers";

export function getSaveRoundLabel(): string {
  const no = parseRoundNo(getRoundTag());
  return no ? `제${no}회에 저장` : "저장";
}

interface SaveNumbersButtonProps {
  onClick: () => void;
  saved?: boolean;
  isDuplicate?: boolean;
  saving?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md";
  /** 기본: 제{N}회에 저장 */
  idleLabel?: string;
  /** amber(킹·추천) | violet(사주) */
  tone?: "amber" | "violet";
}

export default function SaveNumbersButton({
  onClick,
  saved = false,
  isDuplicate = false,
  saving = false,
  disabled = false,
  fullWidth = true,
  size = "md",
  idleLabel,
  tone = "amber",
}: SaveNumbersButtonProps) {
  const idleTone =
    tone === "violet"
      ? "border-violet-300 text-gray-800 bg-gray-50 hover:bg-gray-100"
      : "border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100";

  const py = size === "sm" ? "py-2.5" : "py-3.5";
  const text = size === "sm" ? "text-sm" : "text-base";
  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  let stateClass = idleTone;
  if (saved) stateClass = "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default";
  else if (isDuplicate) stateClass = "border-gray-200 text-gray-400 bg-gray-50 cursor-default";
  else if (saving || disabled) stateClass = `${idleTone} opacity-60 cursor-not-allowed`;

  const label = saved
    ? "저장 완료"
    : isDuplicate
      ? "이번 주 저장됨"
        : saving
        ? "저장 중…"
        : (idleLabel ?? getSaveRoundLabel());

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saved || isDuplicate || saving || disabled}
      className={`${fullWidth ? "w-full" : "flex-1 min-w-[120px]"} ${py} rounded-xl border font-semibold ${text} flex items-center justify-center gap-2 transition-colors ${stateClass}`}
    >
      {saving ? (
        <Loader2 className={`${icon} animate-spin`} />
      ) : saved || isDuplicate ? (
        <CheckCircle2 className={icon} />
      ) : (
        <Bookmark className={icon} />
      )}
      {label}
    </button>
  );
}
