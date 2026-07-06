import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  QrCode,
  Sun,
  X,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import { encodeMobileSlips, GAMES_PER_SLIP } from "@/utils/mobileSlip";

interface MobileSlipQrProps {
  numberSets: number[][];
  open: boolean;
  onClose: () => void;
  title?: string;
}

const SCAN_TIPS = [
  "설정에서 화면 밝기를 최대로 올려 주세요.",
  "QR만 판매점 스캐너에 비추고, 15~25cm 거리를 유지하세요.",
  "반사·지문·스크린 보호필을 닦은 뒤 다시 시도하세요.",
  "10게임이면 슬립 2장입니다. 한 장씩 인식 요청하세요.",
  "인식이 안 되면 「전체 화면 QR」로 크게 보여 주세요.",
];

async function renderQrDataUrl(payload: string, size: number): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: size,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export default function MobileSlipQr({
  numberSets,
  open,
  onClose,
  title = "모바일 슬립지",
}: MobileSlipQrProps) {
  const [slipIndex, setSlipIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [fullscreenQrUrl, setFullscreenQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const slips = useMemo(() => {
    if (numberSets.length === 0) return [];
    try {
      return encodeMobileSlips(numberSets, "M");
    } catch {
      return [];
    }
  }, [numberSets]);

  const slipCount = slips.length;
  const safeIndex = Math.min(slipIndex, Math.max(0, slipCount - 1));
  const gamesOnSlip = numberSets.slice(
    safeIndex * GAMES_PER_SLIP,
    safeIndex * GAMES_PER_SLIP + GAMES_PER_SLIP,
  );
  const amount = gamesOnSlip.length * 1000;
  const payload = slips[safeIndex] ?? "";

  const exitFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!open) return;
    setSlipIndex(0);
    setFullscreen(false);
  }, [open, numberSets]);

  useEffect(() => {
    if (!open || slipCount === 0) {
      setQrDataUrl(null);
      setFullscreenQrUrl(null);
      return;
    }
    let cancelled = false;
    setError(null);
    Promise.all([renderQrDataUrl(payload, 512), renderQrDataUrl(payload, 1024)])
      .then(([normal, large]) => {
        if (!cancelled) {
          setQrDataUrl(normal);
          setFullscreenQrUrl(large);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setFullscreenQrUrl(null);
          setError("QR 코드를 만들지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, payload, slipCount]);

  useEffect(() => {
    if (!open || !fullscreen) return;
    let wakeLock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* ignore */
      }
    };
    void acquire();
    return () => {
      void wakeLock?.release();
    };
  }, [open, fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, exitFullscreen]);

  if (!open) return null;

  if (fullscreen && (fullscreenQrUrl || qrDataUrl)) {
    return (
      <div
        className="fixed inset-0 z-[60] bg-white flex flex-col"
        role="dialog"
        aria-label="전체 화면 모바일 슬립지 QR"
      >
        <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-amber-50">
          <p className="text-base font-bold text-amber-900">
            판매점 스캐너에 인식 요청해 주세요
          </p>
          <button
            type="button"
            onClick={exitFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold text-sm"
          >
            <Minimize2 className="w-5 h-5" />
            닫기
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">
          <p className="text-lg font-bold text-gray-900 mb-1">
            슬립 {safeIndex + 1} / {slipCount} · {gamesOnSlip.length}게임
          </p>
          <p className="text-base text-gray-600 mb-4 text-center">
            밝기 최대 · 15~25cm 거리 · QR만 화면에 맞추기
          </p>
          <div className="bg-white p-2 border-4 border-amber-400 rounded-lg shadow-lg max-w-[min(96vw,28rem)] max-h-[min(70vh,28rem)] aspect-square flex items-center justify-center">
            <img
              src={fullscreenQrUrl ?? qrDataUrl!}
              alt="모바일 슬립지 QR 전체 화면"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
          {slipCount > 1 && (
            <div className="flex items-center gap-6 mt-6">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={() => setSlipIndex((i) => Math.max(0, i - 1))}
                className="p-3 rounded-full bg-gray-100 disabled:opacity-30"
                aria-label="이전 슬립"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <span className="text-lg font-bold text-gray-800">
                {safeIndex + 1} / {slipCount}
              </span>
              <button
                type="button"
                disabled={safeIndex >= slipCount - 1}
                onClick={() => setSlipIndex((i) => Math.min(slipCount - 1, i + 1))}
                className="p-3 rounded-full bg-gray-100 disabled:opacity-30"
                aria-label="다음 슬립"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode className="w-6 h-6 text-amber-600 shrink-0" />
            <h3 className="font-bold text-lg text-gray-900 truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-lg font-extrabold text-amber-900 mb-1">
              판매점 스캐너에 인식 요청해 주세요
            </p>
            <p className="text-base text-amber-900 leading-relaxed">
              종이 슬립 없이 번호가 입력됩니다. 인식이 어려우면 아래
              <strong> 「전체 화면 QR」</strong>을 눌러 주세요.
            </p>
          </div>

          {slipCount === 0 ? (
            <p className="text-base text-red-600 text-center py-8">표시할 번호가 없습니다.</p>
          ) : (
            <>
              <div className="bg-gray-900 rounded-2xl p-5 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-base text-white/90 mb-4 font-medium">
                  <span>
                    {new Date().toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}{" "}
                    작성
                  </span>
                  <span>
                    {safeIndex + 1} / {slipCount}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border-2 border-white shadow-inner">
                  {error ? (
                    <p className="text-base text-red-600 w-[min(88vw,20rem)] aspect-square flex items-center justify-center text-center px-4">
                      {error}
                    </p>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="모바일 슬립지 QR"
                      className="w-[min(88vw,20rem)] aspect-square"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-[min(88vw,20rem)] aspect-square animate-pulse bg-gray-100 rounded" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  disabled={!qrDataUrl}
                  className="mt-4 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  <Maximize2 className="w-5 h-5" />
                  전체 화면 QR (인식 잘 됨)
                </button>

                {slipCount > 1 && (
                  <div className="flex items-center gap-5 mt-4 w-full justify-center">
                    <button
                      type="button"
                      disabled={safeIndex === 0}
                      onClick={() => setSlipIndex((i) => Math.max(0, i - 1))}
                      className="p-3 rounded-full bg-white/15 text-white disabled:opacity-30 min-w-[48px] min-h-[48px] flex items-center justify-center"
                      aria-label="이전 슬립"
                    >
                      <ChevronLeft className="w-7 h-7" />
                    </button>
                    <span className="text-base text-white font-semibold">
                      슬립 {safeIndex + 1} / {slipCount}
                    </span>
                    <button
                      type="button"
                      disabled={safeIndex >= slipCount - 1}
                      onClick={() => setSlipIndex((i) => Math.min(slipCount - 1, i + 1))}
                      className="p-3 rounded-full bg-white/15 text-white disabled:opacity-30 min-w-[48px] min-h-[48px] flex items-center justify-center"
                      aria-label="다음 슬립"
                    >
                      <ChevronRight className="w-7 h-7" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                <p className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Sun className="w-5 h-5" />
                  인식 잘 되게 하는 방법
                </p>
                <ol className="space-y-2 list-decimal list-inside text-base text-blue-900 leading-relaxed">
                  {SCAN_TIPS.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ol>
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <p className="text-base font-bold text-gray-900 mb-3">
                  {gamesOnSlip.length}게임 · 예상금액 {amount.toLocaleString("ko-KR")}원
                </p>
                <div className="space-y-3">
                  {gamesOnSlip.map((nums, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-base font-bold text-gray-800 w-12 shrink-0">
                        수동
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[...nums]
                          .sort((a, b) => a - b)
                          .map((n) => (
                            <LottoBall key={n} number={n} size="md" />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-base text-gray-700 text-center leading-relaxed font-medium">
                앱에서 결제되지 않습니다. 판매점 스캐너에 인식 요청 후 현장에서 결제하세요.
                매장·스캐너마다 인식이 다를 수 있습니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
