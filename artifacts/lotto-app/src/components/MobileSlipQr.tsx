import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ChevronLeft, ChevronRight, Lock, QrCode, ShieldCheck, Smartphone, Store, X } from "lucide-react";
import {
  TrustHeader,
  TrustPanel,
  TrustStepGuide,
} from "@/components/TrustUI";
import { encodeMobileSlips, GAMES_PER_SLIP } from "@/utils/mobileSlip";
import type { SlipGame as DraftSlipGame } from "@/utils/slipDraft";

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

function chunkSheets(games: DraftSlipGame[]): DraftSlipGame[][] {
  const sheets: DraftSlipGame[][] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    sheets.push(games.slice(i, i + GAMES_PER_SLIP));
  }
  return sheets;
}

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
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sheets = useMemo(() => chunkSheets(games), [games]);

  const payloads = useMemo(() => {
    if (games.length === 0) return [] as string[];
    try {
      return encodeMobileSlips(
        games.map((game) => ({
          numbers: game.numbers,
          mode: game.mode ?? (game.numbers.length === 0 ? "A" : "M"),
        })),
      );
    } catch {
      return [] as string[];
    }
  }, [games]);

  const payload = payloads[activeSheetIndex] ?? "";

  useEffect(() => {
    if (!open) {
      setActiveSheetIndex(0);
      return;
    }
    if (activeSheetIndex >= sheets.length) {
      setActiveSheetIndex(Math.max(0, sheets.length - 1));
    }
  }, [activeSheetIndex, open, sheets.length]);

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

  const doneSheetCount = sheets.filter((sheetGames) => {
    const anchorId = sheetGames[0]?.id;
    return Boolean(anchorId && printDoneSheetIds.has(anchorId));
  }).length;

  const activeSheetGames = sheets[activeSheetIndex] ?? [];
  const hasMultipleSheets = sheets.length > 1;

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
            onClick={onClose}
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
              lead="슬립 1장(5게임)씩 QR을 스캔해 주세요. 화면 밝기를 최대로 올리면 인식이 잘 됩니다."
            />

            {hasMultipleSheets ? (
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  type="button"
                  disabled={activeSheetIndex <= 0}
                  onClick={() => setActiveSheetIndex((i) => Math.max(0, i - 1))}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-30"
                  aria-label="이전 슬립"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <p className="text-sm font-extrabold text-gray-900">
                  슬립 {activeSheetIndex + 1}장 QR · {activeSheetGames.length}게임
                </p>
                <button
                  type="button"
                  disabled={activeSheetIndex >= sheets.length - 1}
                  onClick={() => setActiveSheetIndex((i) => Math.min(sheets.length - 1, i + 1))}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-30"
                  aria-label="다음 슬립"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <p className="text-center text-sm font-extrabold text-gray-900 mb-2">
                슬립 1장 · {activeSheetGames.length}게임
              </p>
            )}

            {!payload ? (
              <p className="text-center text-red-600 py-8 text-sm">{error ?? "표시할 QR이 없습니다."}</p>
            ) : error ? (
              <p className="text-center text-red-600 py-8 text-sm">{error}</p>
            ) : qrDataUrl ? (
              <div className="trust-qr-display trust-qr-display--slip">
                <img
                  src={qrDataUrl}
                  alt={`판매점 스캐너용 QR · 슬립 ${activeSheetIndex + 1}장`}
                  className="trust-qr-display__img trust-qr-display__img--slip"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="trust-qr-display trust-qr-display--slip">
                <div className="trust-qr-display__img trust-qr-display__img--slip animate-pulse bg-gray-100 rounded-lg" />
              </div>
            )}

            <div className="slip-qr-scan-games">
              <p className="slip-qr-scan-games__heading">
                슬립 출력 확인
                <span className="slip-qr-scan-games__count">
                  {doneSheetCount}/{sheets.length}
                </span>
              </p>
              <ul className="slip-qr-scan-games__list">
                {sheets.map((sheetGames, sheetIndex) => {
                  const anchorId = sheetGames[0]?.id;
                  const done = Boolean(anchorId && printDoneSheetIds.has(anchorId));
                  const isActive = sheetIndex === activeSheetIndex;
                  return (
                    <li
                      key={`qr-sheet-${sheetIndex}-${anchorId ?? "empty"}`}
                      className={`slip-qr-scan-games__row${done ? " slip-qr-scan-games__row--done" : ""}${isActive ? " slip-qr-scan-games__row--active" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSheetIndex(sheetIndex)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-extrabold text-gray-900">
                          슬립 {sheetIndex + 1}장
                          {isActive ? (
                            <span className="ml-1.5 text-xs font-bold text-[#127a6e]">QR 표시 중</span>
                          ) : null}
                        </p>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">
                          {sheetGames.length}게임
                        </p>
                      </button>
                      {done ? (
                        <span className="slip-qr-scan-games__done-badge">출력완료</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onMarkPrintDone(sheetIndex)}
                          className="slip-qr-scan-games__done-btn"
                        >
                          출력완료
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <TrustStepGuide
              compact
              steps={[...SLIP_QR_STEPS]}
              trust="슬립마다 QR을 한 번씩 스캔한 뒤 출력완료를 눌러 주세요"
            />
          </TrustPanel>
        </div>
      </div>
    </div>
  );
}
