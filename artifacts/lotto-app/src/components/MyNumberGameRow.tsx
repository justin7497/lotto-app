import LottoBall from "@/components/LottoBall";
import type { SavedNumberGameItem } from "@/utils/savedNumberGames";
import { numberLineStats } from "@/utils/numberStats";
import { slipGameLabel } from "@/utils/mobileSlip";

export type { SavedNumberGameItem as MyNumberGameItem };

export default function MyNumberGameRow({
  item,
  selectable,
  selected,
  slipCompleted = false,
  compact = false,
  onToggleSelect,
}: {
  item: SavedNumberGameItem;
  selectable?: boolean;
  selected?: boolean;
  slipCompleted?: boolean;
  compact?: boolean;
  onToggleSelect?: () => void;
}) {
  const stats = numberLineStats(item.numbers);
  const label = slipGameLabel({
    numbers: item.numbers,
    mode: item.slipPickMode,
  });
  const ballSlots =
    label === "반자동"
      ? [...item.numbers, ...Array.from({ length: 6 - item.numbers.length }, () => null)]
      : label === "자동"
        ? Array.from({ length: 6 }, () => null)
        : item.numbers.map((n) => n);

  return (
    <article
      className={`my-number-row${selected ? " my-number-row--selected" : ""}${selectable ? " my-number-row--selectable" : ""}${slipCompleted ? " my-number-row--slip-done" : ""}`}
      onClick={selectable ? onToggleSelect : undefined}
      onKeyDown={
        selectable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleSelect?.();
              }
            }
          : undefined
      }
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
    >
      {slipCompleted ? (
        <span className="my-number-row__slip-watermark" aria-hidden>
          QR 슬립지 만들기 완료
        </span>
      ) : null}

      {selectable ? (
        <span className="my-number-row__check" aria-hidden>
          <span className={`my-number-row__check-dot${selected ? " my-number-row__check-dot--on" : ""}`} />
        </span>
      ) : null}

      <div className="my-number-row__main">
        <div className="my-number-row__balls ball-row ball-row--fluid">
          {ballSlots.map((n, index) =>
            n === null ? (
              <span
                key={`q-${index}`}
                className="slip-ball-placeholder inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-500 font-bold shrink-0"
              >
                ?
              </span>
            ) : (
              <LottoBall key={`${item.key}-${index}`} number={n} size="sm" />
            ),
          )}
        </div>

        <div className="my-number-row__stats">
          <span>번호 합: {stats.sum}</span>
          <span className="my-number-row__stats-sep" aria-hidden>
            ·
          </span>
          <span>
            홀수: {stats.odd}개, 짝수: {stats.even}개
          </span>
        </div>

        {!compact ? (
          <p className="my-number-row__meta">
            <span>출처 {item.sourceLabel}</span>
            <span className="my-number-row__stats-sep" aria-hidden>
              ·
            </span>
            <span>생성 {item.savedAtLabel}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
