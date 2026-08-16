import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Lock, QrCode, RefreshCw, ScanLine, ShieldCheck, Ticket, Trophy } from "lucide-react";
import QrWinResultView from "@/components/QrWinResultView";
import SubPageHeaderBar from "@/components/SubPageHeaderBar";
import { themePopupImage } from "@/data/pageHero";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { dismissOverlayBack } from "@/utils/overlayBackStack";
import {
  TrustHeader,
  TrustPanel,
  TrustScannerCard,
  TrustScannerFrame,
  TrustStepGuide,
} from "@/components/TrustUI";
import {
  parseQrWinScan,
  type DhlotteryWinQr,
  type QrWinParseResult,
} from "@/utils/dhlotteryQr";
import { useLottoContext } from "@/context/LottoDataContext";
import { startQrScanner, formatQrScannerError } from "@/utils/qrScanner";
import {
  CameraPermissionPrimer,
  resolveCameraPermission,
} from "@/components/CameraPermissionPrimer";
import {
  hasStoredCameraPermission,
  markCameraPermissionGranted,
} from "@/utils/cameraPermission";

interface QrWinScannerSheetProps {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
}

type View = "permission" | "scan" | "result" | "error";

const WIN_QR_STEPS = [
  { step: "1", text: "티켓 QR 찾기", icon: Ticket },
  { step: "2", text: "카메라에 맞추기", icon: ScanLine },
  { step: "3", text: "결과 확인", icon: Trophy },
] as const;

export default function QrWinScannerSheet({
  open,
  onClose,
  embedded = false,
}: QrWinScannerSheetProps) {
  const readerId = useId().replace(/:/g, "");
  const { allRounds } = useLottoContext();
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const handledRef = useRef(false);

  const [view, setView] = useState<View>("permission");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<DhlotteryWinQr | null>(null);

  const [scanSession, setScanSession] = useState(0);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const applyScan = useCallback(
    (raw: string) => {
      if (handledRef.current) return;
      const parsed: QrWinParseResult = parseQrWinScan(raw);
      if (!parsed.ok) {
        handledRef.current = true;
        void stopScanner();
        setScanError(parsed.message);
        setView("error");
        return;
      }
      handledRef.current = true;
      void stopScanner();
      setResult(parsed.data);
      setView("result");
    },
    [stopScanner],
  );

  const goToScan = useCallback(() => {
    handledRef.current = false;
    setCameraError(null);
    setScanError(null);
    setView("scan");
    setScanSession((n) => n + 1);
  }, []);

  const startScannerSession = useCallback(async () => {
    goToScan();
    await stopScanner();
    try {
      const handle = await startQrScanner(
        readerId,
        (decoded) => applyScan(decoded),
        {
          embedded,
          onError: (message) => setCameraError(message),
          onReady: () => {
            markCameraPermissionGranted();
            setCameraError(null);
          },
        },
      );
      scannerRef.current = handle;
    } catch (error) {
      setCameraError(formatQrScannerError(error));
      throw error;
    }
  }, [applyScan, embedded, goToScan, readerId, stopScanner]);

  const beginScanFlow = useCallback(async () => {
    if (hasStoredCameraPermission()) {
      await startScannerSession();
      return;
    }

    const permission = await resolveCameraPermission();
    if (permission === "granted") {
      await startScannerSession();
      return;
    }
    if (permission === "unsupported") {
      setCameraError("이 기기에서는 카메라 QR 스캔을 지원하지 않습니다.");
      setView("scan");
      return;
    }
    if (permission === "denied") {
      setCameraError("카메라 권한이 거부되었습니다. 설정에서 허용해 주세요.");
      setView("scan");
      return;
    }
    setView("permission");
  }, [startScannerSession]);

  const resetToScan = useCallback(() => {
    setResult(null);
    setScanError(null);
    handledRef.current = false;
    void beginScanFlow();
  }, [beginScanFlow]);

  const showInternalBack = open && (view === "result" || view === "error");
  useOverlayBack(showInternalBack, resetToScan);
  const closeSheet = useOverlayBack(open && !embedded, onClose);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setView("permission");
      setResult(null);
      setScanError(null);
      setCameraError(null);
      handledRef.current = false;
      return;
    }

    void beginScanFlow();
    return () => {
      void stopScanner();
    };
  }, [open, beginScanFlow, stopScanner]);

  const round = result
    ? (allRounds.find((r) => r.drwNo === result.roundNo) ?? null)
    : null;

  if (!open) return null;

  if (view === "result" && result) {
    if (embedded) {
      return (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <QrWinResultView
            result={result}
            round={round}
            onBack={() => {
              if (!dismissOverlayBack()) resetToScan();
            }}
            onRescan={resetToScan}
            embedded
          />
        </div>
      );
    }

    return (
      <QrWinResultView
        result={result}
        round={round}
        onBack={onClose}
        onRescan={resetToScan}
      />
    );
  }

  function handleBack() {
    if (view === "error" || view === "result") {
      if (!dismissOverlayBack()) resetToScan();
      return;
    }
    if (embedded) {
      onClose();
      return;
    }
    closeSheet();
  }

  const shellClass = embedded
    ? "flex flex-1 flex-col min-h-0 overflow-hidden"
    : "fixed inset-0 z-[75] flex flex-col bg-white sub-page-sheet";

  return (
    <div className={shellClass}>
      {!embedded ? (
        <SubPageHeaderBar
          title="QR 당첨 확인"
          image={themePopupImage("guideWin")}
          onBack={handleBack}
        />
      ) : null}

      {view === "permission" ? (
        <div
          className={`qr-scan-layout${embedded ? " qr-scan-layout--embedded" : ""} number-import-ticket flex flex-1 flex-col min-h-0 px-3 sm:px-4 trust-shell trust-shell--fill`}
        >
          <div className="number-import-ticket__center">
            <TrustPanel>
              <CameraPermissionPrimer
                title="QR 당첨 확인"
                description="복권 QR을 읽으려면 카메라 접근이 필요합니다. 아래 버튼을 누른 뒤 「사이트에 있는 동안 허용」을 선택하면 다음부터는 팝업이 뜨지 않습니다."
                onStart={startScannerSession}
              />
            </TrustPanel>
          </div>
        </div>
      ) : view === "scan" ? (
        <div
          className={`qr-scan-layout${embedded ? " qr-scan-layout--embedded" : ""} number-import-ticket flex flex-1 flex-col min-h-0 px-3 sm:px-4 trust-shell trust-shell--fill`}
        >
          <div className="number-import-ticket__center">
            <TrustPanel>
              <TrustHeader
                badges={[
                  { icon: ShieldCheck, label: "공식 당첨 QR" },
                  { icon: Lock, label: "즉시 확인" },
                ]}
                lead="복권 티켓 QR로 당첨 여부를 확인합니다"
              />
              <TrustScannerCard label="복권 우측 상단 QR을 맞춰 주세요">
                <div key={scanSession} className="qr-scanner-wrap qr-scanner-wrap--ticket rounded-xl overflow-hidden bg-black relative">
                  <div id={readerId} className="qr-scanner-reader" />
                  {!cameraError ? (
                    <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                      <TrustScannerFrame />
                    </div>
                  ) : (
                    <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <QrCode className="w-12 h-12 text-white/70" />
                      <p className="text-lg text-white/90 font-semibold leading-relaxed">{cameraError}</p>
                    </div>
                  )}
                </div>
              </TrustScannerCard>
              <TrustStepGuide compact steps={[...WIN_QR_STEPS]} />
            </TrustPanel>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-8 trust-shell trust-shell--fill">
          <TrustPanel className="text-center">
            <TrustHeader
              badges={[{ icon: ShieldCheck, label: "다시 시도" }]}
              lead="인식할 수 없습니다"
            />
            <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">{scanError}</p>
            <button
              type="button"
              onClick={resetToScan}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#127a6e] text-white text-lg font-bold px-6 py-3.5 w-full"
            >
              <RefreshCw className="w-5 h-5" />
              다시 스캔
            </button>
          </TrustPanel>
        </div>
      )}
    </div>
  );
}
