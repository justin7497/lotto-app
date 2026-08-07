import { useCallback, useEffect, useState } from "react";
import NumberImportSheet from "@/components/NumberImportSheet";
import QrWinScannerSheet from "@/components/QrWinScannerSheet";
import SubPageHeaderBar from "@/components/SubPageHeaderBar";
import { themePopupImage } from "@/data/pageHero";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { collapseOverlayHistory } from "@/utils/overlayBackStack";

export type QrHubTab = "win" | "save";

export default function QrHubSheet({
  open,
  onClose,
  initialTab = "win",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: QrHubTab;
}) {
  const [tab, setTab] = useState<QrHubTab>(initialTab);
  const finishClose = useCallback(() => {
    collapseOverlayHistory();
    onClose();
  }, [onClose]);
  useOverlayBack(open, finishClose);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-white sub-page-sheet qr-hub-sheet">
      <SubPageHeaderBar
        title="QR 당첨확인/저장"
        image={themePopupImage("guideWin")}
        onBack={finishClose}
      />

      <div className="win-page-tabs shrink-0" role="tablist" aria-label="QR 기능">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "win"}
          className={`win-page-tabs__btn${tab === "win" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("win")}
        >
          당첨확인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "save"}
          className={`win-page-tabs__btn${tab === "save" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("save")}
        >
          번호저장
        </button>
      </div>

      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <QrWinScannerSheet open={tab === "win"} embedded onClose={finishClose} />
        <NumberImportSheet open={tab === "save"} embedded onClose={finishClose} />
      </div>
    </div>
  );
}
