import LottoBall from "@/components/LottoBall";
import { DRAW_BALL_COUNT } from "@/utils/drawGame";

export default function DrawResultsPanel({ drawn }: { drawn: number[] }) {
  return (
    <div className="ball-draw-page__results">
      <p className="ball-draw-page__results-label">추출된 번호</p>
      <div className="ball-draw-page__results-row">
        {Array.from({ length: DRAW_BALL_COUNT }, (_, i) => {
          const num = drawn[i];
          return num ? (
            <LottoBall
              key={`draw-ball-${i}`}
              number={num}
              size="sm"
              variant="gloss"
            />
          ) : (
            <span key={`slot-${i}`} className="ball-draw-page__empty-slot" aria-hidden />
          );
        })}
      </div>
    </div>
  );
}
