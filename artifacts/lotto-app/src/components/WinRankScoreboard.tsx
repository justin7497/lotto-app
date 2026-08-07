import type { RoundWinStats } from "@/utils/winHistory";

const RANK_BOARD: Array<{
  rank: string;
  label: string;
  glow: string;
  cell: string;
  text: string;
}> = [
  {
    rank: "1",
    label: "1등",
    glow: "shadow-[0_0_12px_rgba(250,204,21,0.55)]",
    cell: "bg-yellow-400/15 border-yellow-400/50",
    text: "text-yellow-300",
  },
  {
    rank: "2",
    label: "2등",
    glow: "shadow-[0_0_12px_rgba(249,115,22,0.5)]",
    cell: "bg-orange-500/15 border-orange-400/50",
    text: "text-orange-300",
  },
  {
    rank: "3",
    label: "3등",
    glow: "shadow-[0_0_12px_rgba(168,85,247,0.5)]",
    cell: "bg-purple-500/15 border-purple-400/50",
    text: "text-purple-300",
  },
  {
    rank: "4",
    label: "4등",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.5)]",
    cell: "bg-blue-500/15 border-blue-400/50",
    text: "text-blue-300",
  },
  {
    rank: "5",
    label: "5등",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    cell: "bg-emerald-500/15 border-emerald-400/50",
    text: "text-emerald-300",
  },
];

interface WinRankScoreboardProps {
  stats: RoundWinStats;
  title?: string;
  compact?: boolean;
}

export default function WinRankScoreboard({
  stats,
  title = "등수 전광판",
  compact = false,
}: WinRankScoreboardProps) {
  const totalWins = RANK_BOARD.reduce((n, { rank }) => n + (stats.ranks[rank] ?? 0), 0);

  return (
    <div
      className={`rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden ${
        compact ? "" : "mb-4"
      }`}
    >
      <div className="px-3 py-2 border-b border-slate-700/60 flex items-center justify-between gap-2">
        <p className={`font-bold text-slate-200 ${compact ? "text-sm" : "text-base"}`}>{title}</p>
        <p className={`text-slate-400 ${compact ? "text-caption" : "text-sm"}`}>
          총 {stats.total}게임 · 당첨 {totalWins}
        </p>
      </div>

      <div className={`grid grid-cols-5 gap-1.5 ${compact ? "p-2" : "p-3"}`}>
        {RANK_BOARD.map(({ rank, label, glow, cell, text }) => {
          const count = stats.ranks[rank] ?? 0;
          return (
            <div
              key={rank}
              className={`rounded-lg border text-center ${cell} ${count > 0 ? glow : ""} ${
                compact ? "px-1 py-1.5" : "px-1.5 py-2.5"
              }`}
            >
              <p className={`font-semibold ${text} ${compact ? "text-caption" : "text-sm"}`}>
                {label}
              </p>
              <p
                className={`font-black tabular-nums text-white ${
                  compact ? "text-lg leading-tight" : "text-2xl leading-none mt-0.5"
                }`}
              >
                {count}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className={`px-3 py-2 border-t border-slate-700/60 flex flex-wrap gap-x-4 gap-y-1 text-slate-400 ${
          compact ? "text-caption" : "text-sm"
        }`}
      >
        <span>낙첨 {stats.noWin}</span>
        {stats.pending > 0 ? <span>결과 대기 {stats.pending}</span> : null}
      </div>
    </div>
  );
}
