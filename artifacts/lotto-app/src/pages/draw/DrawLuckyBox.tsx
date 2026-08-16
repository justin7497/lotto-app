import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DrawGameShell from "@/components/DrawGameShell";
import DrawIllustScene from "@/components/DrawIllustScene";
import DrawSceneBall from "@/components/DrawSceneBall";
import { useDrawSave } from "@/hooks/useDrawSave";
import { runDrawReveal } from "@/utils/drawReveal";
import { buildLottoDraw, DRAW_BALL_COUNT } from "@/utils/drawGame";

type Phase = "idle" | "opening" | "revealing" | "done";

const OPEN_MS = 1200;
const REVEAL_GAP_MS = 380;

export default function DrawLuckyBox() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawn, setDrawn] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const orderRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);

  const done = phase === "done";
  const { saved, saveError, isDuplicate, resetSaveState, handleSave } = useDrawSave(
    drawn,
    "추첨 · 행운상자",
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

  const openBox = useCallback(() => {
    clearTimers();
    setDrawn([]);
    setOpen(false);
    resetSaveState();
    orderRef.current = buildLottoDraw();
    setPhase("opening");
    schedule(() => setOpen(true), 120);
    schedule(() => revealNumbers(), OPEN_MS);
  }, [clearTimers, revealNumbers, resetSaveState, schedule]);

  const busy = phase !== "idle" && phase !== "done";
  const statusText =
    phase === "idle"
      ? "상자를 열면 오늘의 행운 번호가 나옵니다"
      : phase === "opening"
        ? "상자가 열리는 중…"
        : phase === "revealing"
          ? `${drawn.length} / ${DRAW_BALL_COUNT}번째 번호 등장`
          : "추첨 완료";

  return (
    <DrawGameShell
      eyebrow="행운 상자"
      statusText={statusText}
      busy={busy}
      done={done}
      drawn={drawn}
      onAction={() => openBox()}
      idleLabel="행운 상자 열기"
      busyLabel={phase === "opening" ? "열리는 중…" : "번호 등장 중…"}
      retryLabel="다시 열기"
      saved={saved}
      isDuplicate={isDuplicate}
      saveError={saveError}
      onSave={() => void handleSave()}
    >
      <DrawIllustScene
        src="/illustrations/illust-draw-lucky-box.png"
        className={`draw-lucky-box${open ? " draw-lucky-box--open" : ""}`}
      >
        <div className="draw-lucky-box__glow" />
        <div className="draw-lucky-box__rays" />
        <div className="draw-lucky-box__balls" aria-hidden>
          <AnimatePresence>
            {drawn.map((num, i) => (
              <motion.span
                key={`chest-ball-${i}-${num}`}
                className="draw-lucky-box__ball"
                style={{ "--ball-i": i } as CSSProperties}
                initial={{ opacity: 0, scale: 0.2, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
              >
                <DrawSceneBall number={num} scene="chest" />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </DrawIllustScene>
    </DrawGameShell>
  );
}
