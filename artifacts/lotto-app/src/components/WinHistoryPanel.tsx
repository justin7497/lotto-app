import { useMemo, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import WinBadge, { WinPendingBadge } from "@/components/WinBadge";
import WinRankScoreboard from "@/components/WinRankScoreboard";
import { useLottoContext } from "@/context/LottoDataContext";
import { useSavedSets } from "@/hooks/useSavedSets";
import { useFavoritePicks } from "@/hooks/useFavoritePicks";
import {
  aggregateWinStats,
  collectWinHistoryGames,
  computeGameWinResult,
  formatRoundWinSummary,
  groupWinHistoryByRound,
  sourceLabel,
  type RoundWinGroup,
} from "@/utils/winHistory";
import { getUserNumberHitState } from "@/utils/savedNumbers";
import { SLIP_SOURCES, type SlipSourceId } from "@/utils/slipSources";
import { onPrintDoneInvalidate } from "@/utils/printDone";
import { restoreAllSavedToWinHistory } from "@/utils/printDoneRestore";
import { backfillArchiveFromSlipDraft } from "@/utils/winHistoryArchive";

function RoundSection({
  group,
  defaultOpen,
}: {
  group: RoundWinGroup;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{group.roundTag}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {group.stats.total}게임 · {formatRoundWinSummary(group.stats)}
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4">
          <WinRankScoreboard stats={group.stats} title="이 회차 등수" compact />

          {group.round && (
            <div className="app-numbers-box">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">당첨번호</p>
              <div className="ball-row ball-row--fluid">
                {[
                  group.round.drwtNo1,
                  group.round.drwtNo2,
                  group.round.drwtNo3,
                  group.round.drwtNo4,
                  group.round.drwtNo5,
                  group.round.drwtNo6,
                ].map((n) => (
                  <LottoBall key={n} number={n} size="sm" />
                ))}
                <span className="text-xs text-gray-600 font-bold self-center shrink-0">+</span>
                <LottoBall number={group.round.bnusNo} size="sm" isBonus />
              </div>
            </div>
          )}

          {SLIP_SOURCES.map(({ id: sourceId }) => {
            const games = group.bySource[sourceId as SlipSourceId];
            if (games.length === 0) return null;
            return (
              <div key={sourceId}>
                <p className="text-xs font-bold text-gray-500 mb-2">
                  {sourceLabel(sourceId as SlipSourceId)}
                </p>
                <ul className="space-y-2.5">
                  {games.map((g) => {
                    const result = computeGameWinResult(g.numbers, group.round);
                    return (
                      <li
                        key={g.id}
                        className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-600 truncate">
                            {g.bundleLabel}
                          </span>
                          {result ? (
                            <WinBadge result={result} className="text-xs py-1 px-2" />
                          ) : (
                            <WinPendingBadge className="text-xs py-1 px-2" />
                          )}
                        </div>
                        <div className="ball-row ball-row--fluid win-result-balls">
                          {g.numbers.map((n) => {
                            const hit = group.round
                              ? getUserNumberHitState(n, g.numbers, group.round)
                              : null;
                            return (
                              <LottoBall
                                key={n}
                                number={n}
                                size="sm"
                                matched={hit === null ? null : hit.matched}
                                isBonus={hit?.isBonusHit ?? false}
                              />
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WinHistoryPanel() {
  const { allRounds } = useLottoContext();
  const { sets, loading: setsLoading } = useSavedSets();
  const { picks, loading: picksLoading } = useFavoritePicks();
  const [slipRefresh, setSlipRefresh] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(
    () => onPrintDoneInvalidate(() => setSlipRefresh((value) => value + 1)),
    [],
  );

  async function handleRestoreHistory() {
    setRestoring(true);
    setRestoreMessage(null);
    try {
      const fromSlip = backfillArchiveFromSlipDraft();
      const fromSaved = await restoreAllSavedToWinHistory(sets, picks);
      setSlipRefresh((value) => value + 1);
      if (fromSlip + fromSaved > 0) {
        setRestoreMessage(
          `슬립 ${fromSlip}건 · 저장번호 ${fromSaved}건을 전광판에 다시 반영했습니다.`,
        );
      } else {
        setRestoreMessage(
          "복구할 기록이 없습니다. 슬립지에 남아 있는 발급완료 번호만 복구할 수 있습니다.",
        );
      }
    } finally {
      setRestoring(false);
    }
  }

  const roundMap = useMemo(
    () => new Map(allRounds.map((r) => [r.drwNo, r])),
    [allRounds],
  );

  const groups = useMemo(() => {
    void slipRefresh;
    const games = collectWinHistoryGames(sets, picks);
    return groupWinHistoryByRound(games, roundMap);
  }, [sets, picks, slipRefresh, roundMap]);

  const totalStats = useMemo(() => aggregateWinStats(groups), [groups]);
  const latestRoundTag = groups[0]?.roundTag ?? null;

  if (setsLoading || picksLoading) {
    return <p className="text-base text-center text-gray-400 py-10">불러오는 중…</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="page-card px-4 py-8 text-center">
        <p className="text-lg font-bold text-gray-800">QR 인쇄 확정한 번호가 없습니다</p>
        <p className="text-base text-gray-500 mt-3 leading-relaxed">
          모바일 슬립지에서 QR을 발급한 뒤
          <br />
          판매점 출력 후 「발급완료」를 눌러 주세요.
        </p>
        <button
          type="button"
          className="mt-5 text-base font-semibold text-[#127a6e] underline underline-offset-2 disabled:opacity-50"
          disabled={restoring}
          onClick={() => void handleRestoreHistory()}
        >
          {restoring ? "복구 중…" : "전광판 기록 복구"}
        </button>
        {restoreMessage ? (
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{restoreMessage}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="win-history-panel">
      <WinRankScoreboard stats={totalStats} title="전체 등수 전광판" />

      <p className="text-base text-gray-600 mb-3 font-medium">
        {groups.length}회차 · 총 {totalStats.total}게임 · QR 인쇄 확정 번호만 집계
      </p>

      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.roundTag}>
            <RoundSection group={group} defaultOpen={group.roundTag === latestRoundTag} />
          </li>
        ))}
      </ul>
    </div>
  );
}
