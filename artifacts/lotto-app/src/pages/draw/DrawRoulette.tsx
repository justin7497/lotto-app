import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DrawGameShell from "@/components/DrawGameShell";
import DrawSceneBall from "@/components/DrawSceneBall";
import { useDrawSave } from "@/hooks/useDrawSave";
import { runDrawReveal } from "@/utils/drawReveal";
import { buildLottoDraw, DRAW_BALL_COUNT } from "@/utils/drawGame";

type Phase = "idle" | "spinning" | "revealing" | "done";

const SPIN_MS = 2800;
const REVEAL_GAP_MS = 450;
const WHEEL_SLICES = 12;

export default function DrawRoulette() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawn, setDrawn] = useState<number[]>([]);
  const [spinDeg, setSpinDeg] = useState(0);
  const orderRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);

  const done = phase === "done";
  const { saved, saveError, isDuplicate, resetSaveState, handleSave } = useDrawSave(
    drawn,
    "추첨 · 돌림판",
    done,
  );

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const revealNumbers = useCallback(() => {
    const order =
      orderRef.current.length === DRAW_BALL_COUNT ? orderRef.current : buildLottoDraw();
    orderRef.current = order;
    setPhase("revealing");
    runDrawReveal(order, setDrawn, () => setPhase("done"), schedule, REVEAL_GAP_MS);
  }, [schedule]);

  const startSpin = useCallback(() => {
    clearTimers();
    setDrawn([]);
    resetSaveState();
    orderRef.current = buildLottoDraw();
    setPhase("spinning");
    const extra = 2160 + Math.floor(Math.random() * 360);
    setSpinDeg((prev) => prev + extra);
    schedule(() => revealNumbers(), SPIN_MS);
  }, [clearTimers, revealNumbers, resetSaveState, schedule]);

  const busy = phase === "spinning" || phase === "revealing";
  const statusText =
    phase === "idle"
      ? "돌림판을 돌리면 행운 번호가 정해집니다"
      : phase === "spinning"
        ? "돌림판이 돌아가는 중…"
        : phase === "revealing"
          ? `${drawn.length} / ${DRAW_BALL_COUNT}번째 번호 공개`
          : "추첨 완료";

  return (
    <DrawGameShell
      eyebrow="행운의 돌림판"
      statusText={statusText}
      busy={busy}
      done={done}
      drawn={drawn}
      onAction={() => startSpin()}
      idleLabel="돌림판 돌리기"
      busyLabel={phase === "spinning" ? "돌리는 중…" : "번호 공개 중…"}
      retryLabel="다시 돌리기"
      saved={saved}
      isDuplicate={isDuplicate}
      saveError={saveError}
      onSave={() => void handleSave()}
    >
      <div className="draw-roulette">
        <div className="draw-roulette__pointer" aria-hidden />
        <div className="draw-roulette__frame" aria-hidden>
          <motion.div
            className="draw-roulette__wheel"
            animate={{ rotate: spinDeg }}
            transition={
              phase === "spinning"
                ? { duration: SPIN_MS / 1000, ease: [0.12, 0.8, 0.2, 1] }
                : { duration: 0 }
            }
          >
            <div className="draw-roulette__face" />
            {Array.from({ length: WHEEL_SLICES }, (_, i) => (
              <span
                key={i}
                className="draw-roulette__divider"
                style={{ transform: `rotate(${(360 / WHEEL_SLICES) * i}deg)` }}
              />
            ))}
            {Array.from({ length: WHEEL_SLICES }, (_, i) => (
              <span
                key={`dot-${i}`}
                className="draw-roulette__rim-dot"
                style={{ transform: `rotate(${(360 / WHEEL_SLICES) * i + 15}deg)` }}
              />
            ))}
            <span className="draw-roulette__hub">행운</span>
            {drawn.map((num, i) => {
              const angle = (360 / DRAW_BALL_COUNT) * i;
              return (
                <div
                  key={`wheel-ball-${i}-${num}`}
                  className="draw-roulette__wheel-ball"
                  style={{ transform: `rotate(${angle}deg) translateY(-3.05rem)` }}
                >
                  <div
                    className="draw-roulette__wheel-ball-upright"
                    style={{ transform: `rotate(${-angle - spinDeg}deg)` }}
                  >
                    <DrawSceneBall number={num} scene="sm" />
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
        <div className="draw-roulette__stand" aria-hidden>
          <span className="draw-roulette__stand-neck" />
          <span className="draw-roulette__stand-base" />
        </div>
      </div>
    </DrawGameShell>
  );
}
