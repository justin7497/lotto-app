import { useCallback, useEffect, useId, useRef, useState } from "react";
import { QrCode, RefreshCw, ShieldCheck, Lock } from "lucide-react";
import ImportGamesPreview from "@/components/ImportGamesPreview";
import SubPageHeaderBar from "@/components/SubPageHeaderBar";
import { themePopupImage } from "@/data/pageHero";
import TicketQrGuide from "@/components/TicketQrGuide";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { collapseOverlayHistory, dismissOverlayBack } from "@/utils/overlayBackStack";
import {
  TrustHeader,
  TrustPanel,
  TrustScannerCard,
  TrustScannerFrame,
} from "@/components/TrustUI";
import {
  looksLikeImportQr,
  parseImportQr,
  saveImportedToMyNumbers,
  type ImportGame,
} from "@/utils/importNumbers";
import { startQrScanner, formatQrScannerError } from "@/utils/qrScanner";
import {
  CameraPermissionPrimer,
  resolveCameraPermission,
} from "@/components/CameraPermissionPrimer";
import {
  hasStoredCameraPermission,
  markCameraPermissionGranted,
} from "@/utils/cameraPermission";

type Mode = "ticket" | "preview";
type TicketView = "permission" | "scan";

export default function NumberImportSheet({
  open,
  onClose,
  onSaved,
  embedded = false,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  embedded?: boolean;
}) {
  const readerId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const handledRef = useRef(false);

  const [mode, setMode] = useState<Mode>("ticket");
  const [ticketView, setTicketView] = useState<TicketView>("permission");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [games, setGames] = useState<ImportGame[]>([]);
  const [roundTag, setRoundTag] = useState<string | undefined>();
  const [sourceLabel, setSourceLabel] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanSession, setScanSession] = useState(0);
  const [scanDoneSlots, setScanDoneSlots] = useState<Set<number>>(() => new Set());

  function markScanDoneSlot(slotIndex: number) {
    setScanDoneSlots((prev) => {
      const next = new Set(prev);
      next.add(slotIndex);
      return next;
    });
  }

  const activeGames = games.filter((g) => g.mode === "A" || g.numbers.length > 0);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        /* noop */
      }
    }
  }, []);

  const showPreview = useCallback(
    (imported: ImportGame[], label: string, tag?: string) => {
      setGames(imported);
      setSourceLabel(label);
      setRoundTag(tag);
      setSaveError(null);
      setMode("preview");
      void stopScanner();
    },
    [stopScanner],
  );

  const applyTicketQr = useCallback(
    (raw: string) => {
      if (handledRef.current) return;
      const parsed = parseImportQr(raw);
      if (!parsed.ok) {
        if (looksLikeImportQr(raw)) {
          setScanError(parsed.message);
        }
        return;
      }
      handledRef.current = true;
      setScanError(null);
      showPreview(
        parsed.games,
        parsed.source === "ticket" ? "발행 티켓 QR" : "모바일 슬립 QR",
        parsed.roundTag,
      );
    },
    [showPreview],
  );

  const goToTicketScan = useCallback(() => {
    if (!open || mode !== "ticket") return;
    handledRef.current = false;
    setCameraError(null);
    setScanError(null);
    setTicketView("scan");
    setScanSession((n) => n + 1);
  }, [mode, open]);

  const startScannerSession = useCallback(async () => {
    if (!open || mode !== "ticket") return;
    goToTicketScan();
    await stopScanner();
    try {
      const handle = await startQrScanner(
        readerId,
        (decoded) => applyTicketQr(decoded),
        {
          embedded,
          onError: (message) => setCameraError(message),
          onReady: () => {
            markCameraPermissionGranted();
            setCameraError(null);
            setScanError(null);
          },
        },
      );
      scannerRef.current = handle;
    } catch (error) {
      const message =
        error instanceof Error && error.message === "NO_CAMERA"
          ? "카메라를 찾을 수 없습니다."
          : formatQrScannerError(error);
      setCameraError(message);
      throw error;
    }
  }, [applyTicketQr, embedded, goToTicketScan, mode, open, readerId, stopScanner]);

  const beginTicketScanFlow = useCallback(async () => {
    if (!open || mode !== "ticket") return;

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
      setTicketView("scan");
      return;
    }
    if (permission === "denied") {
      setCameraError("카메라 권한이 거부되었습니다. 설정에서 허용해 주세요.");
      setTicketView("scan");
      return;
    }
    setTicketView("permission");
  }, [mode, open, startScannerSession]);

  const reset = useCallback(() => {
    setGames([]);
    setRoundTag(undefined);
    setScanError(null);
    setSaveError(null);
    setScanDoneSlots(new Set());
    setMode("ticket");
    setTicketView("permission");
    handledRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      reset();
      return;
    }

    if (mode !== "ticket") return;

    const frame = requestAnimationFrame(() => {
      void beginTicketScanFlow();
    });

    return () => {
      cancelAnimationFrame(frame);
      void stopScanner();
    };
  }, [beginTicketScanFlow, mode, open, reset, stopScanner]);

  const goBackToTicket = useCallback(() => {
    setMode("ticket");
    setSaveError(null);
    handledRef.current = false;
    void beginTicketScanFlow();
  }, [beginTicketScanFlow]);

  useOverlayBack(open && mode === "preview", goBackToTicket);
  const closeSheet = useOverlayBack(open && !embedded, onClose);

  function finishAndClose() {
    if (embedded) {
      onClose();
      return;
    }
    collapseOverlayHistory();
    onClose();
  }

  async function handleSaveMyNumbers() {
    setSaving(true);
    setSaveError(null);
    const { saved, error } = await saveImportedToMyNumbers(games, roundTag);
    setSaving(false);
    if (error && saved === 0) {
      setSaveError(error);
      return;
    }
    onSaved?.();
    finishAndClose();
  }

  function handleRescan() {
    reset();
    void beginTicketScanFlow();
  }

  function handleBack() {
    if (mode === "preview") {
      if (!dismissOverlayBack()) goBackToTicket();
      return;
    }
    if (embedded) {
      finishAndClose();
      return;
    }
    closeSheet();
  }

  if (!open) return null;

  const title = mode === "preview" ? "가져온 번호 확인" : "발행 티켓 QR";
  const headerImage =
    mode === "ticket" ? themePopupImage("ticketQr") : themePopupImage("myNumbers");

  const shellClass = embedded
    ? `flex flex-1 flex-col min-h-0 overflow-hidden${mode === "preview" ? " number-import-sheet" : ""}`
    : `fixed inset-0 z-[75] flex flex-col bg-white sub-page-sheet${mode === "preview" ? " number-import-sheet" : ""}`;

  return (
    <div className={shellClass}>
      {!embedded ? (
        <SubPageHeaderBar title={title} image={headerImage} onBack={handleBack} />
      ) : null}

      {mode === "preview" ? (
        <div className="qr-win-page qr-win-page--embedded flex flex-1 flex-col min-h-0">
          <div className="qr-win-page__body number-import-sheet__scroll">
            <ImportGamesPreview
              games={games}
              roundTag={roundTag}
              sourceLabel={sourceLabel}
              error={saveError}
              scanDoneSlots={scanDoneSlots}
              onMarkScanDone={markScanDoneSlot}
            />
          </div>
          <div className="number-import-sheet__footer">
            <button
              type="button"
              disabled={saving || activeGames.length === 0}
              onClick={() => void handleSaveMyNumbers()}
              className="page-cta page-cta--teal page-cta--compact w-full disabled:opacity-40"
            >
              내번호에 저장
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleRescan}
              className="qr-win-page__rescan"
            >
              다시 스캔
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`qr-scan-layout${embedded ? " qr-scan-layout--embedded" : ""} number-import-ticket flex flex-1 flex-col min-h-0 px-3 sm:px-4 trust-shell trust-shell--fill`}
        >
          {scanError ? (
            <p className="number-import-ticket__error text-lg text-red-600 text-center whitespace-pre-wrap font-semibold shrink-0 pt-3">
              {scanError}
            </p>
          ) : null}
          <div className="number-import-ticket__center">
            <TrustPanel>
              {ticketView === "permission" ? (
                <CameraPermissionPrimer
                  title="번호 저장 QR 스캔"
                  description="티켓 QR을 읽으려면 카메라 접근이 필요합니다. 아래 버튼을 누른 뒤 「사이트에 있는 동안 허용」을 선택하면 다음부터는 팝업이 뜨지 않습니다."
                  onStart={startScannerSession}
                />
              ) : (
                <>
                  <TrustHeader
                    badges={[
                      { icon: ShieldCheck, label: "공식 QR 인식" },
                      { icon: Lock, label: "안전 저장" },
                    ]}
                    lead="복권 티켓 QR을 스캔해 번호를 불러옵니다"
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
                  <TicketQrGuide compact variant="scan" />
                </>
              )}
            </TrustPanel>
          </div>
          {scanError ? (
            <button
              type="button"
              onClick={handleRescan}
              className="w-full shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-bold mb-4"
            >
              <RefreshCw className="w-5 h-5" />
              다시 스캔
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
