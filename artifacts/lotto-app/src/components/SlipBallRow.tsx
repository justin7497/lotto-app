import LottoBall from "@/components/LottoBall";
import { slipGameLabel, type SlipGame } from "@/utils/mobileSlip";

export default function SlipBallRow({
  game,
  slotLabel,
  tag,
}: {
  game: SlipGame;
  slotLabel?: string;
  tag?: string;
}) {
  const label = slipGameLabel({
    numbers: game.numbers,
    mode: game.mode,
  });
  const slots =
    label === "반자동"
      ? [...game.numbers, ...Array.from({ length: 6 - game.numbers.length }, () => null)]
      : label === "자동"
        ? Array.from({ length: 6 }, () => null)
        : game.numbers.map((n) => n);

  return (
    <div className="slip-ball-row w-full min-w-0">
      <div className="slip-ball-row__meta flex items-center gap-2 mb-1.5 min-w-0">
        {slotLabel ? (
          <span className="text-caption font-bold text-gray-400 w-5 shrink-0">{slotLabel}</span>
        ) : null}
        <span className="text-sm font-bold text-gray-500 shrink-0">{label}</span>
        {tag ? (
          <span className="text-caption font-semibold text-[#127a6e] bg-teal-50 px-1.5 py-0.5 rounded truncate min-w-0">
            {tag}
          </span>
        ) : null}
      </div>
      <div className="ball-row ball-row--fluid slip-ball-row__balls w-full min-w-0 max-w-full">
        {slots.map((n, i) =>
          n === null ? (
            <span
              key={`q-${i}`}
              className="slip-ball-placeholder inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-500 font-bold shrink-0"
            >
              ?
            </span>
          ) : (
            <LottoBall key={`${n}-${i}`} number={n} size="sm" />
          ),
        )}
      </div>
    </div>
  );
}
