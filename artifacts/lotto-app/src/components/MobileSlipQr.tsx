import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Lock, QrCode, ShieldCheck, Smartphone, Store, X } from "lucide-react";
import {
  TrustHeader,
  TrustPanel,
  TrustStepGuide,
} from "@/components/TrustUI";
import { encodeGamesToMobileSlipPayload, GAMES_PER_SLIP } from "@/utils/mobileSlip";
import type { SlipGame as DraftSlipGame } from "@/utils/slipDraft";
import { useOverlayBack } from "@/hooks/useOverlayBack";

interface MobileSlipQrProps {
  games: DraftSlipGame[];
  open: boolean;
  onClose: () => void;
  printDoneSheetIds: ReadonlySet<string>;
  onMarkPrintDone: (sheetIndex: number) => void;
  title?: string;
}

const SLIP_QR_STEPS = [
  { step: "1", text: "번호 담기", icon: Smartphone },
  { step: "2", text: "QR 표시", icon: QrCode },
  { step: "3", text: "판매점 스캔", icon: Store },
] as const;

async function renderQrDataUrl(payload: string, size: number): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export default function MobileSlipQr({
  games,
  open,
  onClose,
  printDoneSheetIds,
  onMarkPrintDone,
}: MobileSlipQrProps) {
  const closeSheet = useOverlayBack(open, onClose);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slips = useMemo(() => {
    if (games.length === 0) return [] as DraftSlipGame[][];
    return [games];
  }, [games]);

  const activeGames = slips[activeSheetIndex] ?? [];
  const gameCount = activeGames.length;
  const isMultiGameQr = gameCount > GAMES_PER_SLIP;

  const payload = useMemo(() => {
    if (activeGames.length === 0) return "";
    try {
      return encodeGamesToMobileSlipPayload(
        activeGames.map((game) => ({
          numbers: game.numbers,
          mode: game.mode ?? (game.numbers.length === 0 ? "A" : "M"),
        })),
      );
    } catch {
      return "";
    }
  }, [activeGames]);

  useEffect(() => {
    if (!open) {
      setActiveSheetIndex(0);
      return;
    }
    if (activeSheetIndex >= slips.length) {
      setActiveSheetIndex(Math.max(0, slips.length - 1));
    }
  }, [activeSheetIndex, open, slips.length]);

  useEffect(() => {
    if (!open || !payload) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    setError(null);
    renderQrDataUrl(payload, 1024)
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setError("QR을 표시할 수 없습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, payload]);

  if (!open) return null;

  const anchorId = activeGames[0]?.id;
  const isPrintDone = Boolean(anchorId && printDoneSheetIds.has(anchorId));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70"
      role="dialog"
      aria-label="판매점 QR"
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        <div className="relative w-full max-w-md mx-auto trust-shell rounded-2xl p-3 sm:p-4 shadow-2xl">
          <button
            type="button"
            onClick={closeSheet}
            className="absolute top-3 right-3 p-2 rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 z-10"
            aria-label="닫기"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <TrustPanel className="trust-panel--wide !max-w-none">
            <TrustHeader
              badges={[
                { icon: ShieldCheck, label: "동행복권 호환" },
                { icon: Lock, label: "번호 미전송" },
              ]}
              lead={
                isMultiGameQr
                  ? `한 번 스캔하면 ${gameCount}게임이 연속 발행됩니다.`
                  : "화면 밝기를 최대로 올리면 인식이 잘 됩니다."
              }
            />

            <p className="text-center text-sm font-extrabold text-gray-900 mb-2">
              {gameCount}게임
            </p>

            {!payload ? (
              <p className="text-center text-red-600 py-8 text-sm">{error ?? "표시할 QR이 없습니다."}</p>
            ) : error ? (
              <p className="text-center text-red-600 py-8 text-sm">{error}</p>
            ) : qrDataUrl ? (
              <div className="trust-qr-display trust-qr-display--slip mobile-slip-qr__img-wrap">
                <img
                  src={qrDataUrl}
                  alt={`판매점 스캐너용 QR · ${gameCount}게임`}
                  className="trust-qr-display__img trust-qr-display__img--slip"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="trust-qr-display trust-qr-display--slip">
                <div className="trust-qr-display__img trust-qr-display__img--slip animate-pulse bg-gray-100 rounded-lg" />
              </div>
            )}

            <div
              className={`slip-qr-scan-games${isPrintDone ? " slip-qr-scan-games--done" : ""}`}
            >
              <p className="slip-qr-scan-games__heading">
                출력 확인
                {isPrintDone ? (
                  <span className="slip-qr-scan-games__heading-done">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                    완료
                  </span>
                ) : null}
              </p>
              <div
                className={`slip-qr-scan-games__row${isPrintDone ? " slip-qr-scan-games__row--done" : ""}`}
              >
                <p className="text-sm font-extrabold text-gray-900 flex-1">{gameCount}게임</p>
                {isPrintDone ? (
                  <span className="slip-qr-scan-games__done-badge">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    발급완료
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkPrintDone(activeSheetIndex)}
                    className="slip-qr-scan-games__done-btn"
                  >
                    발급완료
                  </button>
                )}
              </div>
            </div>

            <TrustStepGuide
              compact
              steps={[...SLIP_QR_STEPS]}
              trust="스캔 후 발급완료를 눌러 주세요"
            />
          </TrustPanel>
        </div>
      </div>
    </div>
  );
}
