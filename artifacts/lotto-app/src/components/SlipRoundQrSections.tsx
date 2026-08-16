import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SlipInlineQr from "@/components/SlipInlineQr";
import { countSlipSheets } from "@/utils/mobileSlip";
import {
  countGamesInSheets,
  countPrintDoneSheets,
  isPastSlipRound,
  type SlipRoundGroup,
} from "@/utils/slipRound";

export default function SlipRoundQrSections({
  groups,
  currentRound,
  activeAnchorId,
  onActiveAnchorChange,
  printDoneSheetIds,
  onMarkPrintDone,
  onDeleteSheet,
  onEditSheet,
  showPromoteToFixed,
  onPromoteToFixed,
}: {
  groups: SlipRoundGroup[];
  currentRound: number;
  activeAnchorId: string | null;
  onActiveAnchorChange: (anchorId: string) => void;
  printDoneSheetIds?: ReadonlySet<string>;
  onMarkPrintDone?: (anchorId: string) => boolean;
  onDeleteSheet?: (anchorId: string) => void;
  onEditSheet?: (anchorId: string) => void;
  showPromoteToFixed?: boolean;
  onPromoteToFixed?: () => void;
}) {
  const [expandedPastRounds, setExpandedPastRounds] = useState<Set<number>>(() => new Set());

  const defaultExpandedPastRounds = useMemo(() => {
    const next = new Set<number>();
    let hasCurrentRoundGroup = false;

    for (const group of groups) {
      if (!isPastSlipRound(group.drwNo, currentRound)) {
        hasCurrentRoundGroup = true;
        continue;
      }
      const hasActive = group.sheets.some((sheet) => sheet[0]?.id === activeAnchorId);
      if (hasActive) next.add(group.drwNo);
    }

    if (!hasCurrentRoundGroup && groups.length > 0) {
      const newestPast = groups.find((group) => isPastSlipRound(group.drwNo, currentRound));
      if (newestPast) next.add(newestPast.drwNo);
    }

    return next;
  }, [groups, currentRound, activeAnchorId]);

  useEffect(() => {
    setExpandedPastRounds((prev) => {
      if (defaultExpandedPastRounds.size === 0) return prev;
      const next = new Set(prev);
      for (const drwNo of defaultExpandedPastRounds) next.add(drwNo);
      return next;
    });
  }, [defaultExpandedPastRounds]);

  function isRoundExpanded(drwNo: number): boolean {
    if (!isPastSlipRound(drwNo, currentRound)) return true;
    return expandedPastRounds.has(drwNo);
  }

  function togglePastRound(group: SlipRoundGroup) {
    const { drwNo } = group;
    if (!isPastSlipRound(drwNo, currentRound)) return;

    setExpandedPastRounds((prev) => {
      const next = new Set(prev);
      const willOpen = !next.has(drwNo);
      if (willOpen) {
        next.add(drwNo);
        const anchor = group.sheets[0]?.[0]?.id;
        if (anchor) onActiveAnchorChange(anchor);
      } else {
        next.delete(drwNo);
      }
      return next;
    });
  }

  if (groups.length === 0) return null;

  return (
    <div className="slip-round-sections">
      {groups.map((group) => {
        const expanded = isRoundExpanded(group.drwNo);
        const past = isPastSlipRound(group.drwNo, currentRound);
        const gameCount = countGamesInSheets(group.sheets);
        const qrCardCount = group.sheets.length;
        // 물리 슬립 장수(5게임 단위) — 연속 발행 묶음은 카드 1장이어도 3장으로 표시
        const physicalSheetCount = group.sheets.reduce(
          (sum, sheet) => sum + countSlipSheets(sheet.length),
          0,
        );
        const doneCount = printDoneSheetIds
          ? countPrintDoneSheets(group.sheets, printDoneSheetIds)
          : 0;
        const allDone = doneCount === qrCardCount && qrCardCount > 0;
        const anchorInGroup = group.sheets.some((sheet) => sheet[0]?.id === activeAnchorId);
        const activeIndex = anchorInGroup
          ? Math.max(0, group.sheets.findIndex((sheet) => sheet[0]?.id === activeAnchorId))
          : 0;
        const activeAnchor = group.sheets[activeIndex]?.[0]?.id ?? null;

        return (
          <section
            key={`slip-round-${group.drwNo}`}
            className={`slip-round-sections__group${past ? " slip-round-sections__group--past" : ""}${
              expanded ? " slip-round-sections__group--open" : ""
            }`}
          >
            {past ? (
              <button
                type="button"
                className="slip-round-sections__toggle"
                onClick={() => togglePastRound(group)}
                aria-expanded={expanded}
              >
                {expanded ? (
                  <ChevronDown className="w-5 h-5 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="w-5 h-5 shrink-0" aria-hidden />
                )}
                <span className="slip-round-sections__toggle-title">{group.drwNo}회</span>
                <span className="slip-round-sections__toggle-meta">
                  {physicalSheetCount}장 · {gameCount}게임
                  {allDone
                    ? " · 발급완료"
                    : doneCount > 0
                      ? ` · 발급 ${doneCount}/${qrCardCount}`
                      : ""}
                </span>
              </button>
            ) : null}

            {expanded ? (
              <SlipInlineQr
                roundLabel={`${group.drwNo}회`}
                sheets={group.sheets}
                activeSheetIndex={activeIndex}
                onSheetChange={(index) => {
                  const anchor = group.sheets[index]?.[0]?.id;
                  if (anchor) onActiveAnchorChange(anchor);
                }}
                onDeleteSheet={
                  onDeleteSheet && activeAnchor
                    ? () => onDeleteSheet(activeAnchor)
                    : undefined
                }
                onEditSheet={
                  onEditSheet && activeAnchor
                    ? () => onEditSheet(activeAnchor)
                    : undefined
                }
                onPromoteToFixed={showPromoteToFixed ? onPromoteToFixed : undefined}
                printDoneSheetIds={printDoneSheetIds}
                onMarkPrintDone={
                  onMarkPrintDone
                    ? (sheetIndex) => {
                        const anchor = group.sheets[sheetIndex]?.[0]?.id;
                        if (!anchor) return false;
                        return onMarkPrintDone(anchor) ?? false;
                      }
                    : undefined
                }
              />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
