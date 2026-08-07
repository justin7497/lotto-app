import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DrawGameShell from "@/components/DrawGameShell";
import DrawSceneBall from "@/components/DrawSceneBall";
import { useDrawSave } from "@/hooks/useDrawSave";
import { buildLottoDraw, DRAW_BALL_COUNT } from "@/utils/drawGame";

type Phase = "idle" | "dropping" | "done";

const DROP_MS = 1100;
const DROP_GAP_MS = 520;
const ROWS = 5;
const COLS = 7;

function buildPegs() {
  const pegs: Array<{ id: string; left: number; top: number }> = [];
  for (let row = 0; row < ROWS; row += 1) {
    const count = row % 2 === 0 ? COLS : COLS - 1;
    const offset = row % 2 === 0 ? 0 : 7;
    for (let col = 0; col < count; col += 1) {
      pegs.push({
        id: `${row}-${col}`,
        left: offset + (col * (100 - offset * 2)) / Math.max(count - 1, 1),
        top: 14 + row * 14.5,
      });
    }
  }
  return pegs;
}

const PEGS = buildPegs();

export default function DrawPlinko() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawn, setDrawn] = useState<number[]>([]);
  const [dropIndex, setDropIndex] = useState(0);
  const [ballX, setBallX] = useState(50);
  const [ballY, setBallY] = useState(6);
  const [activeBall, setActiveBall] = useState<number | null>(null);
  const orderRef = useRef<number[]>([]);
  const stepRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const done = phase === "done";
  const { saved, saveError, isDuplicate, resetSaveState, handleSave } = useDrawSave(
    drawn,
    "추첨 · 플링코",
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

  const dropNext = useCallback(() => {
    const order = orderRef.current;
    const step = stepRef.current;
    if (step >= DRAW_BALL_COUNT) {
      setActiveBall(null);
      setPhase("done");
      return;
    }

    const num = order[step];
    setActiveBall(num);
    setDropIndex(step);
    let x = 50;
    const path: Array<{ x: number; y: number }> = [{ x, y: 6 }];
    for (let row = 0; row < ROWS; row += 1) {
      x += (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 4);
      x = Math.min(88, Math.max(12, x));
      path.push({ x, y: 14 + row * 14.5 });
    }
    const slot = step % DRAW_BALL_COUNT;
    const slotX = 10 + slot * (80 / (DRAW_BALL_COUNT - 1));
    path.push({ x: slotX, y: 90 });

    let i = 0;
    const animateStep = () => {
      const point = path[i];
      if (!point) {
        stepRef.current += 1;
        setDrawn(order.slice(0, stepRef.current));
        setActiveBall(null);
        schedule(dropNext, DROP_GAP_MS);
        return;
      }
      setBallX(point.x);
      setBallY(point.y);
      i += 1;
      schedule(animateStep, DROP_MS / path.length);
    };
    animateStep();
  }, [schedule]);

  const startPlinko = useCallback(() => {
    clearTimers();
    setDrawn([]);
    setDropIndex(0);
    stepRef.current = 0;
    setBallX(50);
    setBallY(6);
    setActiveBall(null);
    resetSaveState();
    orderRef.current = buildLottoDraw();
    setPhase("dropping");
    schedule(dropNext, 200);
  }, [clearTimers, dropNext, resetSaveState, schedule]);

  const busy = phase === "dropping";
  const statusText =
    phase === "idle"
      ? "공이 핀을 타고 떨어지며 번호가 정해집니다"
      : phase === "dropping"
        ? `${drawn.length + (activeBall ? 1 : 0)} / ${DRAW_BALL_COUNT}번째 공 낙하`
        : "추첨 완료";

  const activeSlot = phase === "dropping" ? dropIndex % DRAW_BALL_COUNT : -1;

  return (
    <DrawGameShell
      eyebrow="행운의 길"
      statusText={statusText}
      busy={busy}
      done={done}
      drawn={drawn}
      onAction={() => startPlinko()}
      idleLabel="공 떨어뜨리기"
      busyLabel="공이 떨어지는 중…"
      retryLabel="다시 떨어뜨리기"
      saved={saved}
      isDuplicate={isDuplicate}
      saveError={saveError}
      onSave={() => void handleSave()}
    >
      <div className="draw-plinko">
        <div className="draw-plinko__frame" aria-hidden>
          <div className="draw-plinko__chute" />
          <div className="draw-plinko__board">
            <div className="draw-plinko__board-shine" />
            {PEGS.map((peg) => (
              <span
                key={peg.id}
                className="draw-plinko__peg"
                style={{ left: `${peg.left}%`, top: `${peg.top}%` }}
              />
            ))}
            <AnimatePresence>
              {activeBall ? (
                <motion.div
                  key={`ball-${dropIndex}-${activeBall}`}
                  className="draw-plinko__ball"
                  style={{ left: `${ballX}%`, top: `${ballY}%` }}
                  initial={{ scale: 0.65 }}
                  animate={{ scale: 1 }}
                >
                  <DrawSceneBall number={activeBall} scene="sm" />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="draw-plinko__slots">
              {Array.from({ length: DRAW_BALL_COUNT }, (_, i) => (
                <span
                  key={i}
                  className={`draw-plinko__slot${activeSlot === i ? " draw-plinko__slot--active" : ""}${drawn[i] ? " draw-plinko__slot--filled" : ""}`}
                >
                  {drawn[i] ? <DrawSceneBall number={drawn[i]} scene="mini" /> : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DrawGameShell>
  );
}
