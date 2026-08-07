import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DrawGameShell from "@/components/DrawGameShell";
import DrawSceneBall from "@/components/DrawSceneBall";
import LottoBall from "@/components/LottoBall";
import { useDrawSave } from "@/hooks/useDrawSave";
import { buildLottoDraw, DRAW_BALL_COUNT } from "@/utils/drawGame";

type DrawPhase = "idle" | "mixing" | "drawing" | "done";

const MIX_MS = 2200;
const DRAW_INTERVAL_MS = 1400;

function useTumbleBalls(active: boolean) {
  return useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        num: ((i * 7 + 3) % 45) + 1,
        left: 8 + ((i * 37) % 78),
        top: 6 + ((i * 23) % 58),
        delay: (i % 6) * 0.12,
        size: i % 3 === 0 ? 26 : i % 3 === 1 ? 22 : 20,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active],
  );
}

export default function BallDrawMachine() {
  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [drawn, setDrawn] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const orderRef = useRef<number[]>([]);
  const stepRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const done = phase === "done";
  const { saved, saveError, isDuplicate, resetSaveState, handleSave } = useDrawSave(
    drawn,
    "추첨 · 공뽑기",
    done,
  );

  const tumbleBalls = useTumbleBalls(phase === "mixing" || phase === "drawing");

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setDrawn([]);
    setCurrentBall(null);
    resetSaveState();
    orderRef.current = [];
    stepRef.current = 0;
  }, [clearTimers, resetSaveState]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const drawNext = useCallback(() => {
    const order = orderRef.current;
    const step = stepRef.current;
    if (step >= order.length) {
      setCurrentBall(null);
      setPhase("done");
      return;
    }

    const ball = order[step];
    setCurrentBall(ball);
    setPhase("drawing");

    schedule(() => {
      setDrawn((prev) => [...prev, ball]);
      setCurrentBall(null);
      stepRef.current += 1;
      if (stepRef.current < order.length) {
        schedule(drawNext, 320);
      } else {
        schedule(() => setPhase("done"), 480);
      }
    }, DRAW_INTERVAL_MS - 320);
  }, [schedule]);

  const startDraw = useCallback(() => {
    reset();
    orderRef.current = buildLottoDraw();
    stepRef.current = 0;
    setPhase("mixing");
    schedule(() => drawNext(), MIX_MS);
  }, [drawNext, reset, schedule]);

  const busy = phase === "mixing" || phase === "drawing";
  const statusText =
    phase === "idle"
      ? "추첨기 안의 공이 하나씩 나옵니다"
      : phase === "mixing"
        ? "공을 섞는 중…"
        : phase === "drawing"
          ? `${drawn.length + (currentBall ? 1 : 0)} / ${DRAW_BALL_COUNT}번째 공 추출`
          : "추첨 완료";

  return (
    <DrawGameShell
      eyebrow="실시간 추첨 체험"
      statusText={statusText}
      busy={busy}
      done={done}
      drawn={drawn}
      onAction={() => (done || phase === "idle" ? startDraw() : undefined)}
      idleLabel="추첨 시작"
      busyLabel="추첨 진행 중…"
      retryLabel="다시 추첨"
      saved={saved}
      isDuplicate={isDuplicate}
      saveError={saveError}
      onSave={() => void handleSave()}
    >
      <div className={`ball-draw-machine${busy ? " ball-draw-machine--active" : ""}`}>
        <div className="ball-draw-machine__dome" aria-hidden>
          <div className="ball-draw-machine__glass" />
          <div className="ball-draw-machine__drum">
            {tumbleBalls.map((b) => (
              <span
                key={b.id}
                className="ball-draw-machine__float-ball"
                style={{
                  left: `${b.left}%`,
                  top: `${b.top}%`,
                  animationDelay: `${b.delay}s`,
                }}
              >
                <DrawSceneBall number={b.num} scene="mini" />
              </span>
            ))}
          </div>
          <div className="ball-draw-machine__neck" />
        </div>

        <div className="ball-draw-machine__chute" aria-hidden>
          <AnimatePresence mode="wait">
            {currentBall ? (
              <motion.div
                key={currentBall}
                className="ball-draw-machine__falling"
                initial={{ y: -72, opacity: 0, scale: 0.5 }}
                animate={{ y: 8, opacity: 1, scale: 1 }}
                exit={{ y: 36, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                <LottoBall number={currentBall} size="lg" variant="gloss" dramatic />
              </motion.div>
            ) : (
              <div className="ball-draw-machine__chute-hole" />
            )}
          </AnimatePresence>
        </div>

        <div className="ball-draw-machine__base" aria-hidden />
      </div>
    </DrawGameShell>
  );
}
