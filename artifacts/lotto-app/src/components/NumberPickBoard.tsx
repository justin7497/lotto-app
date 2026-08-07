import type { ReactNode } from "react";

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

export function PickCell({
  number,
  selected,
  excluded,
  disabled,
  onClick,
  variant = "default",
}: {
  number: number;
  selected: boolean;
  excluded?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "default" | "slip";
}) {
  const slipClass = variant === "slip" ? " pick-board__cell--slip" : "";
  const selectedClass = selected
    ? variant === "slip"
      ? " pick-board__cell--slip-selected"
      : " pick-board__cell--selected"
    : "";

  if (excluded) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={false}
        className={`pick-board__cell pick-board__cell--excluded${slipClass}`}
      >
        {variant === "slip" ? (
          <>
            <span className="pick-board__cell-bracket">[</span>
            {number}
            <span className="pick-board__cell-bracket">]</span>
          </>
        ) : (
          number
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`pick-board__cell${slipClass}${selectedClass}`}
    >
      {variant === "slip" ? (
        <>
          <span className="pick-board__cell-bracket">[</span>
          {number}
          <span className="pick-board__cell-bracket">]</span>
        </>
      ) : (
        number
      )}
    </button>
  );
}

export default function NumberPickBoard({
  selected,
  excluded,
  disabledNumbers,
  onToggle,
  autoSemi,
  onAutoSemiChange,
  showAutoSemi = true,
  variant = "default",
  footer,
}: {
  selected: Set<number>;
  excluded?: Set<number>;
  disabledNumbers?: Set<number>;
  onToggle: (n: number) => void;
  autoSemi?: boolean;
  onAutoSemiChange?: (checked: boolean) => void;
  showAutoSemi?: boolean;
  variant?: "default" | "slip";
  footer?: ReactNode;
}) {
  const boardClass = variant === "slip" ? "pick-board pick-board--slip" : "pick-board";

  return (
    <div className={boardClass}>
      <div className="pick-board__grid">
        {ALL_NUMBERS.map((n) => (
          <PickCell
            key={n}
            number={n}
            selected={selected.has(n)}
            excluded={excluded?.has(n)}
            disabled={disabledNumbers?.has(n)}
            onClick={() => onToggle(n)}
            variant={variant}
          />
        ))}
      </div>

      {footer ? <div className="pick-board__footer">{footer}</div> : null}

      {showAutoSemi && onAutoSemiChange ? (
        <label className="pick-board__auto-semi">
          <input
            type="checkbox"
            checked={autoSemi}
            onChange={(e) => onAutoSemiChange(e.target.checked)}
            className="pick-board__auto-semi-input"
          />
          {variant === "slip"
            ? "자동/반자동 선택"
            : "자동/반자동 선택 · ? 는 단말기에서 번호가 나옵니다"}
        </label>
      ) : null}
    </div>
  );
}
