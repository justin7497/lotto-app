import { Ticket } from "lucide-react";
import { useLocation } from "wouter";
import type { GeneratedNumbers } from "@/data/types";
import { SLIP_QR_PATH, sendGeneratedToSlip } from "@/utils/sendToSlip";
import type { SlipGameSourceId } from "@/utils/slipGameMeta";

interface SendToSlipButtonProps {
  games: GeneratedNumbers[];
  source: SlipGameSourceId;
  sourceLabel?: string;
  savedSetId?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function SendToSlipButton({
  games,
  source,
  sourceLabel,
  savedSetId,
  disabled = false,
  size = "md",
  className = "",
}: SendToSlipButtonProps) {
  const [, setLocation] = useLocation();
  const py = size === "sm" ? "py-2.5" : "py-3.5";
  const text = size === "sm" ? "text-sm" : "text-base";
  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const canSend = games.length > 0 && !disabled;

  function handleClick() {
    const result = sendGeneratedToSlip(games, { source, sourceLabel, savedSetId });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setLocation(SLIP_QR_PATH);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canSend}
      className={`w-full ${py} page-cta page-cta--dark flex-col gap-0.5 disabled:opacity-40 ${className}`}
    >
      <span className="inline-flex items-center gap-2">
        <Ticket className={icon} strokeWidth={2.5} />
        슬립지 QR 만들기
      </span>
      <span className={`${size === "sm" ? "text-caption" : "text-sm"} font-medium text-white/75`}>
        판매점 단말기 스캔용
      </span>
    </button>
  );
}
