import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { encodeGamesToMobileSlipPayload, countSlipSheets, GAMES_PER_SLIP } from "@/utils/mobileSlip";
import { normalizeSlipGameForEncode } from "@/utils/slipPickResolve";
import type { SlipGame, SlipSheet } from "@/utils/slipDraft";
import { renderSlipQrDataUrl } from "@/utils/slipQrRender";
import {
  applyAppUpdate,
  fetchRemoteAppVersion,
  getLocalSlipEncodeVersion,
  isLegacySlipPayload,
} from "@/utils/appVersion";

const PRICE_PER_GAME = 1000;
const SWIPE_THRESHOLD_PX = 88;
const SWIPE_VELOCITY_MIN = 0.55;
const SWIPE_VELOCITY_OFFSET_PX = 36;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "88%" : "-88%",
    opacity: 0.35,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-88%" : "88%",
    opacity: 0.35,
    scale: 0.97,
  }),
};

function chunkSheets(games: SlipGame[]): SlipGame[][] {
  const sheets: SlipGame[][] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    sheets.push(games.slice(i, i + GAMES_PER_SLIP));
  }
  return sheets;
}

function toEncodeGames(games: SlipGame[]) {
  return games.map((game) => normalizeSlipGameForEncode(game));
}

export default function SlipInlineQr({
  sheets,
  games,
  activeSheetIndex,
  onSheetChange,
  onDeleteSheet,
  onEditSheet,
  onPromoteToFixed,
  printDoneSheetIds,
  onMarkPrintDone,
  roundLabel,
}: {
  /** 발행된 QR 슬립지 목록 — 항목 하나에 여러 게임(예: 15게임) 포함 가능 → 한 QR 연속 발행 */
  sheets?: SlipSheet[];
  /** @deprecated flat 목록 — sheets 없을 때만 사용 */
  games?: SlipGame[];
  activeSheetIndex: number;
  onSheetChange: (index: number) => void;
  onDeleteSheet?: () => void;
  onEditSheet?: () => void;
  onPromoteToFixed?: () => void;
  printDoneSheetIds?: ReadonlySet<string>;
  onMarkPrintDone?: (sheetIndex: number) => boolean;
  roundLabel?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [issueToast, setIssueToast] = useState<{ slipIndex: number; text: string } | null>(null);
  const [encodeStale, setEncodeStale] = useState(false);
  const slideDirectionRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const slipList = useMemo(() => {
    // 5게임 초과 시트도 쪼개지 않음 — 한 QR 연속 발행
    if (sheets && sheets.length > 0) return sheets;
    if (games && games.length > 0) return [games];
    return chunkSheets(games ?? []);
  }, [sheets, games]);

  const activeGames = slipList[activeSheetIndex] ?? [];
  const slipCount = slipList.length;
  const hasMultipleSlips = slipCount > 1;
  const gameCount = activeGames.length;
  const isMultiGameQr = gameCount > GAMES_PER_SLIP;
  const totalPrice = gameCount * PRICE_PER_GAME;
  const anchorId = activeGames[0]?.id;
  const isPrintDone = Boolean(anchorId && printDoneSheetIds?.has(anchorId));
  const showPrintConfirm = Boolean(onMarkPrintDone && printDoneSheetIds);

  function handleMarkPrintDone(slipIndex: number) {
    const count = slipList[slipIndex]?.length ?? 0;
    const ok = onMarkPrintDone?.(slipIndex);
    if (ok === false) return;
    setIssueToast({ slipIndex, text: `발급완료 · ${count}게임` });
  }

  useEffect(() => {
    if (!issueToast) return;
    const t = window.setTimeout(() => setIssueToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [issueToast]);

  const payload = useMemo(() => {
    if (activeGames.length === 0) return "";
    try {
      return encodeGamesToMobileSlipPayload(toEncodeGames(activeGames));
    } catch {
      return "";
    }
  }, [activeGames]);

  const legacyPayload = Boolean(payload && isLegacySlipPayload(payload));

  useEffect(() => {
    let cancelled = false;
    void fetchRemoteAppVersion().then((remote) => {
      if (cancelled || !remote) return;
      const remoteVer =
        typeof remote.slipEncodeVersion === "number" ? remote.slipEncodeVersion : 0;
      setEncodeStale(remoteVer > getLocalSlipEncodeVersion());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function changeSlip(nextIndex: number) {
    if (nextIndex === activeSheetIndex) return;
    if (nextIndex < 0 || nextIndex >= slipCount) return;
    slideDirectionRef.current = nextIndex > activeSheetIndex ? 1 : -1;
    onSheetChange(nextIndex);
  }

  function goPrevSlip() {
    changeSlip(activeSheetIndex - 1);
  }

  function goNextSlip() {
    changeSlip(activeSheetIndex + 1);
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (!hasMultipleSlips) return;

    const { offset, velocity } = info;
    const absOffsetX = Math.abs(offset.x);
    const passedDistance = absOffsetX >= SWIPE_THRESHOLD_PX;
    const passedVelocity =
      absOffsetX >= SWIPE_VELOCITY_OFFSET_PX && Math.abs(velocity.x) >= SWIPE_VELOCITY_MIN;

    if (!passedDistance && !passedVelocity) return;

    if (offset.x <= 0 && (passedDistance || velocity.x < 0)) {
      goNextSlip();
      return;
    }
    if (offset.x >= 0 && (passedDistance || velocity.x > 0)) {
      goPrevSlip();
    }
  }

  function stopDragPropagation(event: React.PointerEvent) {
    event.stopPropagation();
  }

  useEffect(() => {
    if (!payload || error || encodeStale || legacyPayload) return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    let released = false;
    let sentinel: { release: () => Promise<void> } | null = null;
    void nav.wakeLock
      .request("screen")
      .then((lock) => {
        if (released) {
          void lock.release();
          return;
        }
        sentinel = lock;
      })
      .catch(() => {});
    return () => {
      released = true;
      void sentinel?.release();
    };
  }, [encodeStale, error, legacyPayload, payload]);

  useEffect(() => {
    if (!payload) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    setError(null);
    renderSlipQrDataUrl(payload)
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
  }, [payload]);

  function handleCardPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!hasMultipleSlips || event.pointerType === "touch") return;
    const target = event.target as HTMLElement;
    if (target.closest(".mobile-slip-qr__delete")) return;
    if (target.closest(".mobile-slip-qr__edit")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    if (ratio < 0.28) goPrevSlip();
    else if (ratio > 0.72) goNextSlip();
  }

  if (slipList.length === 0) return null;

  const slideDirection = slideDirectionRef.current;

  return (
    <section className="mobile-slip-qr" aria-label="판매점 QR">
      {hasMultipleSlips ? (
        <div className="mobile-slip-qr__pager">
          <button
            type="button"
            disabled={activeSheetIndex <= 0}
            onClick={goPrevSlip}
            className="mobile-slip-qr__pager-btn"
            aria-label="이전 QR슬립지"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="mobile-slip-qr__pager-label">
            {gameCount}게임 · {activeSheetIndex + 1} / {slipCount}
          </p>
          <button
            type="button"
            disabled={activeSheetIndex >= slipCount - 1}
            onClick={goNextSlip}
            className="mobile-slip-qr__pager-btn"
            aria-label="다음 QR슬립지"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      ) : null}

      <div className="mobile-slip-qr__card-viewport">
        <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
          <motion.div
            key={activeSheetIndex}
            ref={cardRef}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            drag={hasMultipleSlips ? "x" : false}
            dragDirectionLock
            dragMomentum={false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={
              hasMultipleSlips
                ? {
                    left: activeSheetIndex >= slipCount - 1 ? 0.08 : 0.22,
                    right: activeSheetIndex <= 0 ? 0.08 : 0.22,
                  }
                : undefined
            }
            onDragEnd={handleDragEnd}
            className={`mobile-slip-qr__card${hasMultipleSlips ? " mobile-slip-qr__card--swipe" : ""}${isPrintDone ? " mobile-slip-qr__card--issued" : ""}`}
            onPointerUp={handleCardPointerUp}
            aria-label={
              hasMultipleSlips
                ? `${gameCount}게임 QR · ${activeSheetIndex + 1} / ${slipCount}`
                : `${gameCount}게임 QR`
            }
          >
            <div className="mobile-slip-qr__card-head">
              {onPromoteToFixed ? (
                <button
                  type="button"
                  onClick={onPromoteToFixed}
                  onPointerDown={stopDragPropagation}
                  className="mobile-slip-qr__edit"
                  aria-label="고정번호로 이동"
                >
                  고정
                </button>
              ) : onEditSheet ? (
                <button
                  type="button"
                  onClick={onEditSheet}
                  onPointerDown={stopDragPropagation}
                  className="mobile-slip-qr__edit"
                  aria-label="슬립지 번호 수정"
                >
                  <Pencil className="w-4 h-4 shrink-0" aria-hidden />
                  수정
                </button>
              ) : null}
              <div className="mobile-slip-qr__card-head-text">
                <p className="mobile-slip-qr__sheet-count">
                  {isMultiGameQr
                    ? `${countSlipSheets(gameCount)}장 · ${gameCount}게임`
                    : `${gameCount}게임`}
                </p>
                <p className="mobile-slip-qr__sheet-meta">
                  {roundLabel ? `${roundLabel} · ` : ""}
                  총 {totalPrice.toLocaleString("ko-KR")}원
                </p>
              </div>
              {onDeleteSheet ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  onPointerDown={stopDragPropagation}
                  className="mobile-slip-qr__delete"
                  aria-label="QR슬립지 삭제"
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden />
                  삭제
                </button>
              ) : null}
            </div>

            {!payload || error ? (
              <p className="mobile-slip-qr__error">{error ?? "표시할 QR이 없습니다."}</p>
            ) : encodeStale || legacyPayload ? (
              <div className="mobile-slip-qr__stale">
                <p className="mobile-slip-qr__stale-title">QR 형식 업데이트 필요</p>
                <p className="mobile-slip-qr__stale-text">
                  이전 버전 QR은 판매점에서 인쇄되지 않습니다. 업데이트하면
                  같은 슬립이 올바른 QR로 다시 표시됩니다. 슬립을 지울 필요는 없습니다.
                </p>
                <button
                  type="button"
                  className="mobile-slip-qr__stale-btn"
                  onClick={() => applyAppUpdate()}
                >
                  지금 업데이트
                </button>
              </div>
            ) : qrDataUrl ? (
          <div className="mobile-slip-qr__img-wrap">
            <img
              src={qrDataUrl}
              alt={`판매점 스캐너용 QR · ${gameCount}게임`}
              className="mobile-slip-qr__img"
              draggable={false}
            />
          </div>
        ) : (
              <div className="mobile-slip-qr__img mobile-slip-qr__img--loading" aria-hidden />
            )}

            {isMultiGameQr ? (
              <p className="mobile-slip-qr__batch-hint">
                한 번 스캔하면 {gameCount}게임이 연속 발행됩니다.
              </p>
            ) : null}

            {hasMultipleSlips ? (
              <p className="mobile-slip-qr__swipe-hint">← 밀어서 다른 QR슬립지로 이동 →</p>
            ) : null}

            {showPrintConfirm ? (
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
                {hasMultipleSlips ? (
                  <ul className="slip-qr-scan-games__list">
                    {slipList.map((slipGames, slipIndex) => {
                      const slipAnchor = slipGames[0]?.id;
                      const done = Boolean(slipAnchor && printDoneSheetIds?.has(slipAnchor));
                      const isActive = slipIndex === activeSheetIndex;
                      return (
                        <li
                          key={`qr-slip-${slipIndex}-${slipAnchor ?? "empty"}`}
                          className={`slip-qr-scan-games__row${done ? " slip-qr-scan-games__row--done" : ""}${isActive ? " slip-qr-scan-games__row--active" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => onSheetChange(slipIndex)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-extrabold text-gray-900">
                              {slipGames.length}게임
                              {isActive ? (
                                <span className="ml-1.5 text-xs font-bold text-[#127a6e]">
                                  QR 표시 중
                                </span>
                              ) : null}
                            </p>
                          </button>
                          {done ? (
                            <span className="slip-qr-scan-games__done-badge">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              발급완료
                            </span>
                          ) : (
                            <div className="slip-qr-scan-games__done-stack">
                              {issueToast?.slipIndex === slipIndex ? (
                                <p className="mobile-slip-qr__issue-toast" role="status">
                                  {issueToast.text}
                                </p>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleMarkPrintDone(slipIndex)}
                                className="slip-qr-scan-games__done-btn slip-qr-scan-games__done-btn--pending"
                              >
                                발급완료
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : isPrintDone ? (
                  <div className="slip-qr-scan-games__row slip-qr-scan-games__row--done">
                    <p className="text-sm font-extrabold text-gray-900 flex-1">{gameCount}게임</p>
                    <span className="slip-qr-scan-games__done-badge">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      발급완료
                    </span>
                  </div>
                ) : (
                  <div className="slip-qr-scan-games__row">
                    <p className="text-sm font-extrabold text-gray-900 flex-1">{gameCount}게임</p>
                    <div className="slip-qr-scan-games__done-stack">
                      {issueToast?.slipIndex === activeSheetIndex ? (
                        <p className="mobile-slip-qr__issue-toast" role="status">
                          {issueToast.text}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleMarkPrintDone(activeSheetIndex)}
                        className="slip-qr-scan-games__done-btn slip-qr-scan-games__done-btn--pending"
                      >
                        발급완료
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div
              className={`mobile-slip-qr__slots${hasMultipleSlips ? " mobile-slip-qr__slots--sheets" : ""}`}
              style={
                hasMultipleSlips
                  ? ({ "--sheet-count": slipCount } as CSSProperties)
                  : undefined
              }
              aria-hidden
            >
              {hasMultipleSlips
                ? slipList.map((_, index) => (
                    <span
                      key={index}
                      className={`mobile-slip-qr__slot${index === activeSheetIndex ? " mobile-slip-qr__slot--on" : ""}`}
                    />
                  ))
                : Array.from({ length: GAMES_PER_SLIP }, (_, i) => (
                    <span
                      key={i}
                      className={`mobile-slip-qr__slot${i < gameCount ? " mobile-slip-qr__slot--on" : ""}`}
                    />
                  ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {onDeleteSheet ? (
        <DeleteConfirmDialog
          open={deleteOpen}
          title="QR슬립지 삭제"
          message={`${gameCount}게임 QR슬립지를 삭제할까요?`}
          confirmLabel="삭제"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            onDeleteSheet();
            setDeleteOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
