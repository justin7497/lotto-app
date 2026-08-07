import PageCard from "@/components/PageCard";
import WinHistoryPanel from "@/components/WinHistoryPanel";
import { TrustHeader, TrustPanel, TrustStepGuide } from "@/components/TrustUI";
import { BarChart3, QrCode, ShieldCheck } from "lucide-react";

const WIN_HISTORY_STEPS = [
  { step: "1", text: "QR 슬립 발급", icon: QrCode },
  { step: "2", text: "발급완료 표시", icon: ShieldCheck },
  { step: "3", text: "전광판 확인", icon: BarChart3 },
] as const;

export default function WinNotifications() {
  return (
    <div className="page-content">
      <TrustPanel className="trust-panel--wide mb-4">
        <TrustHeader
          badges={[
            { icon: QrCode, label: "QR 인쇄 확정" },
            { icon: BarChart3, label: "등수 전광판" },
          ]}
          lead="모바일 슬립지에서 「발급완료」한 번호만 당첨 결과에 반영됩니다"
        />
        <TrustStepGuide compact steps={[...WIN_HISTORY_STEPS]} />
      </TrustPanel>

      <PageCard className="!p-3 sm:!p-4">
        <WinHistoryPanel />
      </PageCard>
    </div>
  );
}
