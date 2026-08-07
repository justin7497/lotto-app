import LottoBall from "@/components/LottoBall";
import type { ImportGame } from "@/utils/importNumbers";
import { slipGameLabel } from "@/utils/mobileSlip";

const PREVIEW_SLOT_COUNT = 5;
const SLOT_LABELS = ["A", "B", "C", "D", "E"] as const;

function isFilledGame(game: ImportGame | undefined): game is ImportGame {
  if (!game) return false;
  return game.mode === "A" || game.numbers.length > 0;
}

function gameTypeLabel(game: ImportGame): string {
  if (game.mode === "A") return "자동";
  if (game.numbers.length > 0 && game.numbers.length < 6) return "반자동";
  return "수동";
}

function ImportGameBalls({ game }: { game: ImportGame }) {
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
    <>
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
    </>
  );
}

function EmptyGameBalls() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="import-preview__empty-ball slip-ball-placeholder inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-300 font-bold shrink-0"
        >
          ·
        </span>
      ))}
    </>
  );
}

export default function ImportGamesPreview({
  games,
  roundTag,
  sourceLabel,
  error,
  scanDoneSlots,
  onMarkScanDone,
}: {
  games: ImportGame[];
  roundTag?: string;
  sourceLabel: string;
  error?: string | null;
  scanDoneSlots?: ReadonlySet<number>;
  onMarkScanDone?: (slotIndex: number) => void;
}) {
  const filled = games.filter((g) => g.mode === "A" || g.numbers.length > 0);
  const doneCount = scanDoneSlots
    ? filled.filter((_, i) => scanDoneSlots.has(i)).length
    : 0;
  const showScanConfirm = Boolean(onMarkScanDone);
  const slots = Array.from({ length: PREVIEW_SLOT_COUNT }, (_, i) => games[i] ?? null);

  return (
    <>
      <div className="qr-win-page__round">
        <p className="qr-win-page__round-no">{sourceLabel}</p>
        {roundTag ? <p className="qr-win-page__round-date">{roundTag}</p> : null}
        <p className="qr-win-page__round-date">
          인식 {Math.min(filled.length, PREVIEW_SLOT_COUNT)}게임
          {showScanConfirm ? ` · 확인 ${doneCount}/${Math.min(filled.length, PREVIEW_SLOT_COUNT)}` : ""}
        </p>
      </div>

      <section className="qr-win-page__games">
        {showScanConfirm ? (
          <p className="qr-win-page__draw-title px-2 pt-2">게임별 스캔 확인</p>
        ) : null}
        <ul className="qr-win-page__game-list">
          {slots.map((game, i) => {
            const label = SLOT_LABELS[i];
            const filledGame = isFilledGame(game);

            return (
              <li
                key={`${label}-${filledGame ? game.numbers.join("-") : "empty"}`}
                className="qr-win-page__game-row"
              >
                <div className="qr-win-page__game-label">
                  <span className="qr-win-page__game-letter">{label}</span>
                  <span className="qr-win-page__game-type">
                    {filledGame ? gameTypeLabel(game) : "비어 있음"}
                  </span>
                </div>
                <div className="qr-win-page__game-balls ball-row ball-row--fluid">
                  {filledGame ? <ImportGameBalls game={game} /> : <EmptyGameBalls />}
                </div>
                {showScanConfirm ? (
                  filledGame ? (
                    scanDoneSlots?.has(i) ? (
                      <span className="qr-win-page__rank qr-win-page__rank--win">완료</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onMarkScanDone?.(i)}
                        className="issued-btn shrink-0 !px-2 !py-1.5 !text-sm"
                      >
                        완료
                      </button>
                    )
                  ) : (
                    <span className="qr-win-page__rank qr-win-page__rank--lose">—</span>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {error ? <p className="import-preview__error">{error}</p> : null}
    </>
  );
}
