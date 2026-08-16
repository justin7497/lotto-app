import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BallDrawPhysicsCanvas from "@/components/BallDrawPhysicsCanvas";
import DrawGameShell from "@/components/DrawGameShell";
import DrawIllustScene from "@/components/DrawIllustScene";
import LottoBall from "@/components/LottoBall";
import { useDrawSave } from "@/hooks/useDrawSave";
import { buildLottoDraw, DRAW_BALL_COUNT } from "@/utils/drawGame";

type DrawPhase = "idle" | "mixing" | "drawing" | "done";

const MIX_MS = 2400;
const DRAW_INTERVAL_MS = 1400;

export default function BallDrawMachine() {
  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [drawn, setDrawn] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [physicsKey, setPhysicsKey] = useState(0);
  const orderRef = useRef<number[]>([]);
  const stepRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const done = phase === "done";
  const { saved, saveError, isDuplicate, resetSaveState, handleSave } = useDrawSave(
    drawn,
    "추첨 · 공뽑기",
    done,
  );

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
    setPhysicsKey((k) => k + 1);
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
      eyebrow="추첨 뽑기"
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
      <DrawIllustScene
        src="/illustrations/illust-ball-draw.png"
        className={`ball-draw-machine${busy ? " ball-draw-machine--active" : ""}`}
      >
        <div className="ball-draw-machine__drum">
          <BallDrawPhysicsCanvas
            active={phase !== "idle"}
            vigorous={phase === "mixing"}
            resetKey={physicsKey}
          />
        </div>
        <div className="ball-draw-machine__chute">
          <AnimatePresence mode="wait">
            {currentBall ? (
              <motion.div
                key={currentBall}
                className="ball-draw-machine__falling"
                initial={{ y: -56, opacity: 0, scale: 0.45 }}
                animate={{ y: 2, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
              >
                <LottoBall number={currentBall} size="md" variant="gloss" dramatic />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DrawIllustScene>
    </DrawGameShell>
  );
}
