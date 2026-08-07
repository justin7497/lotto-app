import { useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SelectedAffirmation } from "@/data/affirmationData";

const SWIPE_THRESHOLD_PX = 72;
const SWIPE_VELOCITY_MIN = 0.5;
const SWIPE_VELOCITY_OFFSET_PX = 32;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "72%" : "-72%",
    opacity: 0.4,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-72%" : "72%",
    opacity: 0.4,
    scale: 0.98,
  }),
};

export default function AffirmationCardSwiper({
  affirmations,
  activeIndex,
  onIndexChange,
  categoryLabel,
  categoryEmoji,
}: {
  affirmations: readonly SelectedAffirmation[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  categoryLabel: string;
  categoryEmoji: string;
}) {
  const [slideDirection, setSlideDirection] = useState(0);
  const total = affirmations.length;
  const current = affirmations[activeIndex];
  const hasMultiple = total > 1;

  function changeIndex(nextIndex: number) {
    if (nextIndex === activeIndex) return;
    if (nextIndex < 0 || nextIndex >= total) return;
    setSlideDirection(nextIndex > activeIndex ? 1 : -1);
    onIndexChange(nextIndex);
  }

  function goPrev() {
    changeIndex(activeIndex - 1);
  }

  function goNext() {
    changeIndex(activeIndex + 1);
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (!hasMultiple) return;

    const { offset, velocity } = info;
    const absOffsetX = Math.abs(offset.x);
    const passedDistance = absOffsetX >= SWIPE_THRESHOLD_PX;
    const passedVelocity =
      absOffsetX >= SWIPE_VELOCITY_OFFSET_PX && Math.abs(velocity.x) >= SWIPE_VELOCITY_MIN;

    if (!passedDistance && !passedVelocity) return;

    if (offset.x <= 0 && (passedDistance || velocity.x < 0)) {
      goNext();
      return;
    }
    if (offset.x >= 0 && (passedDistance || velocity.x > 0)) {
      goPrev();
    }
  }

  if (!current) return null;

  const progressPercent = ((activeIndex + 1) / total) * 100;

  return (
    <div className="affirmation-swiper">
      <div className="affirmation-swiper__viewport">
        <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
          <motion.article
            key={current.id}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            drag={hasMultiple ? "x" : false}
            dragDirectionLock
            dragMomentum={false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={
              hasMultiple
                ? {
                    left: activeIndex >= total - 1 ? 0.08 : 0.22,
                    right: activeIndex <= 0 ? 0.08 : 0.22,
                  }
                : undefined
            }
            onDragEnd={handleDragEnd}
            className={`affirmation-card${hasMultiple ? " affirmation-card--swipe" : ""}`}
            aria-live="polite"
            aria-label={`${categoryLabel} 확언 ${activeIndex + 1}번`}
          >
            <span className="affirmation-card__quote" aria-hidden>
              “
            </span>
            {categoryEmoji ? (
              <span className="affirmation-card__watermark" aria-hidden>
                {categoryEmoji}
              </span>
            ) : null}
            <p className="affirmation-card__content">{current.content}</p>
            <h3 className="affirmation-card__title">{current.title}</h3>
          </motion.article>
        </AnimatePresence>
      </div>

      {hasMultiple ? (
        <div className="affirmation-swiper__controls">
          <div className="affirmation-swiper__pager">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={goPrev}
              className="affirmation-swiper__pager-btn"
              aria-label="이전 확언"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="affirmation-swiper__pager-label">
              {activeIndex + 1} / {total}
            </p>
            <button
              type="button"
              disabled={activeIndex >= total - 1}
              onClick={goNext}
              className="affirmation-swiper__pager-btn"
              aria-label="다음 확언"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div
            className="affirmation-swiper__progress"
            role="progressbar"
            aria-valuenow={activeIndex + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label={`확언 ${activeIndex + 1}번째`}
          >
            <span
              className="affirmation-swiper__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="affirmation-swiper__hint">← 밀어서 다른 확언 보기 →</p>
        </div>
      ) : (
        <p className="affirmation-swiper__pager-label affirmation-swiper__pager-label--solo">
          나의 소원
        </p>
      )}
    </div>
  );
}
