import LottoBall from "@/components/LottoBall";
import type { SavedNumberGameItem } from "@/utils/savedNumberGames";

export default function SlipLoadNumberRow({
  item,
  selected,
  onToggle,
}: {
  item: SavedNumberGameItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`slip-load-row${selected ? " slip-load-row--selected" : ""}`}
      aria-pressed={selected}
    >
      <span className="slip-load-row__check" aria-hidden>
        <span className={`slip-load-row__check-dot${selected ? " slip-load-row__check-dot--on" : ""}`} />
      </span>
      <span className="slip-load-row__balls ball-row ball-row--fluid">
        {item.numbers.map((n) => (
          <LottoBall key={n} number={n} size="sm" />
        ))}
      </span>
    </button>
  );
}
