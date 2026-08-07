import { useMemo } from "react";
import { ConfirmActionButton, DeleteIconButton } from "@/components/DeleteConfirmDialog";
import SavedGamesListHeader from "@/components/SavedGamesListHeader";
import SlipBallRow from "@/components/SlipBallRow";
import { GAMES_PER_SLIP } from "@/utils/mobileSlip";
import { SLIP_SOURCE_LABELS } from "@/utils/slipGameMeta";
import type { SlipGame } from "@/utils/slipDraft";

function chunkSlipSheets(games: SlipGame[]): SlipGame[][] {
  const sheets: SlipGame[][] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    sheets.push(games.slice(i, i + GAMES_PER_SLIP));
  }
  return sheets;
}

function sheetSourceSummary(sheetGames: SlipGame[]): string {
  const labels = [
    ...new Set(
      sheetGames
        .map((g) => g.sourceLabel)
        .filter((label): label is string => Boolean(label)),
    ),
  ];
  if (labels.length === 1) return labels[0];
  if (labels.length > 1) return labels.join(" · ");
  return SLIP_SOURCE_LABELS.manual;
}

export default function SlipGamesList({
  games,
  onRemoveGame,
  onRemoveSheet,
  printDoneSheetIds,
  onMarkPrintDone,
}: {
  games: SlipGame[];
  onRemoveGame: (id: string) => void;
  onRemoveSheet: (sheetIndex: number) => void;
  printDoneSheetIds?: ReadonlySet<string>;
  onMarkPrintDone?: (sheetIndex: number) => void;
}) {
  const sheets = useMemo(() => chunkSlipSheets(games), [games]);

  if (games.length === 0) {
    return (
      <p className="text-base text-muted-readable py-4 text-center">번호를 선택해 주세요.</p>
    );
  }

  return (
    <div className="min-w-0">
      {sheets.map((sheetGames, sheetIndex) => {
        const globalOffset = sheetIndex * GAMES_PER_SLIP;
        const sourceSummary = sheetSourceSummary(sheetGames);
        const sheetAnchorId = sheetGames[0]?.id;
        const sheetPrinted =
          Boolean(sheetAnchorId) && (printDoneSheetIds?.has(sheetAnchorId) ?? false);

        return (
          <section
            key={`sheet-${sheetIndex}-${sheetAnchorId ?? "empty"}`}
            className={`content-round saved-set-card${sheetPrinted ? " saved-set-card--issued" : ""}`}
          >
            {sheetPrinted ? (
              <div className="saved-set-card__watermark" aria-hidden>
                <span className="saved-set-card__watermark-text">출력완료</span>
              </div>
            ) : null}

            <div className="content-round__body">
              <article className="content-set !border-b-0">
                <div className="content-set__head">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900">
                      슬립 {sheetIndex + 1}장
                      {sheetPrinted ? (
                        <span className="ml-2 text-sm font-extrabold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                          출력완료
                        </span>
                      ) : null}
                    </p>
                    <p className="text-base font-semibold text-muted-readable mt-0.5 truncate">
                      출처 · {sourceSummary} · {sheetGames.length}게임
                    </p>
                  </div>
                  <div className="content-set__actions">
                    {!sheetPrinted && onMarkPrintDone ? (
                      <button
                        type="button"
                        onClick={() => onMarkPrintDone(sheetIndex)}
                        className="issued-btn"
                      >
                        출력완료
                      </button>
                    ) : null}
                    <ConfirmActionButton
                      label={`${sheetGames.length}게임 삭제`}
                      tone="neutral"
                      size="compact"
                      confirmTitle="슬립 삭제"
                      confirmMessage={`슬립 ${sheetIndex + 1}장(${sheetGames.length}게임)을 삭제할까요?`}
                      confirmLabel="삭제"
                      onConfirm={() => onRemoveSheet(sheetIndex)}
                    />
                  </div>
                </div>

                <div className={sheetPrinted ? "saved-set-card__body" : undefined}>
                  <SavedGamesListHeader />
                  <ul className="content-rows">
                    {sheetGames.map((game, idx) => {
                      const sourceTag =
                        game.sourceLabel && game.sourceLabel !== sourceSummary
                          ? game.sourceLabel
                          : undefined;
                      return (
                        <li
                          key={game.id}
                          className="content-row content-row--slip flex items-start gap-1"
                        >
                          <div className="flex-1 min-w-0">
                            <SlipBallRow
                              game={game}
                              slotLabel={["A", "B", "C", "D", "E"][idx]}
                              tag={sourceTag}
                            />
                          </div>
                          <DeleteIconButton
                            className="shrink-0"
                            confirmTitle="번호 삭제"
                            confirmMessage={`${globalOffset + idx + 1}번째 게임을 삭제할까요?`}
                            onConfirm={() => onRemoveGame(game.id)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            </div>
          </section>
        );
      })}
    </div>
  );
}
