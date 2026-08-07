import { DRAW_BALL_COUNT } from "@/utils/drawGame";

type Scheduler = (fn: () => void, ms: number) => void;

/** 6개 번호를 간격을 두고 순차 공개 (공뽑기와 동일한 완료 보장) */
export function runDrawReveal(
  order: number[],
  onUpdate: (drawn: number[]) => void,
  onComplete: () => void,
  schedule: Scheduler,
  gapMs: number,
) {
  let count = 0;

  const step = () => {
    count += 1;
    onUpdate(order.slice(0, Math.min(count, order.length)));
    if (count < DRAW_BALL_COUNT) {
      schedule(step, gapMs);
      return;
    }
    schedule(onComplete, gapMs);
  };

  step();
}
