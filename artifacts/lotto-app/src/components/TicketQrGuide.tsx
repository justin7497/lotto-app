import { BookmarkCheck, ScanLine, Ticket } from "lucide-react";
import { TrustStepGuide } from "@/components/TrustUI";

const TICKET_QR_STEPS = [
  { step: "1", text: "티켓 QR 찾기", icon: Ticket },
  { step: "2", text: "카메라에 맞추기", icon: ScanLine },
  { step: "3", text: "번호 저장", icon: BookmarkCheck },
] as const;

export default function TicketQrGuide({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  variant?: "default" | "scan";
}) {
  return (
    <TrustStepGuide
      compact={compact}
      steps={[...TICKET_QR_STEPS]}
      lead={
        variant === "scan"
          ? undefined
          : compact
            ? undefined
            : "구매한 복권이나 모바일 슬립의 QR을 스캔하면 번호를 바로 불러올 수 있어요"
      }
    />
  );
}
