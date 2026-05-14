import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Trophy, Play, Square, RotateCcw, Clock, ChevronDown, ChevronUp,
  Scale, Brain, Activity, LayoutGrid, Hash, Link2, FlaskConical,
  Sparkles,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import { useLottoContext } from "@/context/LottoDataContext";
import {
  runBacktest, saveBacktestResult, loadBacktestResult,
  BACKTEST_MODES, BACKTEST_MODE_LABELS,
} from "@/utils/backtest";
import type { BacktestResult, ModeStats } from "@/utils/backtest";
import type { GeneratorMode } from "@/data/types";

const MODE_META: Record<string, { icon: React.ElementType; color: string; bg: string; bar: string }> = {
  balanced:    { icon: Scale,       color: "text-emerald-600", bg: "bg-emerald-100", bar: "#10B981" },
  weighted:    { icon: Brain,       color: "text-violet-600",  bg: "bg-violet-100",  bar: "#8B5CF6" },
  delta:       { icon: Activity,    color: "text-teal-600",    bg: "bg-teal-100",    bar: "#14B8A6" },
  sector:      { icon: LayoutGrid,  color: "text-sky-600",     bg: "bg-sky-100",     bar: "#0EA5E9" },
  tail:        { icon: Hash,        color: "text-pink-600",    bg: "bg-pink-100",    bar: "#EC4899" },
  consecutive: { icon: Link2,       color: "text-lime-600",    bg: "bg-lime-100",    bar: "#84CC16" },
  monte:       { icon: FlaskConical, color: "text-amber-600",  bg: "bg-amber-100",   bar: "#F59E0B" },
};

const RANK_MEDAL = ["🥇", "🥈", "🥉", "4위", "5위", "6위", "7위"];

const GAMES_OPTIONS = [
  { value: 5,  label: "5게임",  desc: "빠름 (~5초)" },
  { value: 10, label: "10게임", desc: "권장 (~10초)" },
  { value: 20, label: "20게임", desc: "정밀 (~20초)" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ModeRankCard({ stats, rank }: { stats: ModeStats; rank: number }) {
  const meta = MODE_META[stats.mode] ?? { icon: Scale, color: "text-gray-600", bg: "bg-gray-100", bar: "#6B7280" };
  const Icon = meta.icon;
  const total3plus = stats.exact3 + stats.exact4 + stats.exact5 + stats.exact6;
  const rate = stats.totalCombos > 0 ? ((total3plus / stats.totalCombos) * 100).toFixed(2) : "0.00";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06 }}
      className={`bg-white rounded-2xl border shadow-sm p-4 ${rank === 0 ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-100"}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl w-8 text-center">{RANK_MEDAL[rank] ?? String(rank + 1)}</span>
        <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{stats.label}</p>
          <p className="text-xs text-gray-400">{stats.totalCombos.toLocaleString()}게임 분석 · 3+일치율 {rate}%</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold text-gray-800">{stats.score.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">종합 점수</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "3개 일치", value: stats.exact3, color: "bg-yellow-100 text-yellow-800" },
          { label: "4개 일치", value: stats.exact4, color: "bg-blue-100 text-blue-800" },
          { label: "5개 일치", value: stats.exact5, color: "bg-purple-100 text-purple-800" },
          { label: "6개 일치", value: stats.exact6, color: "bg-red-100 text-red-900" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl px-2 py-2 text-center ${item.color}`}>
            <p className="text-base font-extrabold leading-tight">{item.value}</p>
            <p className="text-[10px] font-semibold opacity-80 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function HallOfFameCard({ entry, allRounds }: { entry: BacktestResult["hallOfFame"][0]; allRounds: import("@/data/types").LottoRound[] }) {
  const round = allRounds.find((r) => r.drwNo === entry.round);
  const winningSet = round
    ? new Set([round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6])
    : null;
  const meta = MODE_META[entry.mode];
  const Icon = meta?.icon ?? Scale;
  const matchLabel = entry.matchCount === 6 ? "🎉 1등!" : entry.matchCount === 5 ? "🌟 2등 근접" : "4개 일치";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${meta?.bg ?? "bg-gray-100"} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${meta?.color ?? "text-gray-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-bold text-gray-700">제{entry.round}회</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta?.bg ?? "bg-gray-100"} ${meta?.color ?? "text-gray-600"}`}>
            {BACKTEST_MODE_LABELS[entry.mode]}
          </span>
          <span className="text-[10px] font-bold text-amber-600">{matchLabel}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {entry.numbers.map((n, i) => (
            <div key={i} className={winningSet?.has(n) ? "ring-2 ring-offset-1 ring-yellow-400 rounded-full" : ""}>
              <LottoBall number={n} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Backtest() {
  const { allRounds } = useLottoContext();
  const [gamesPerMode, setGamesPerMode] = useState(10);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [showHof, setShowHof] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = loadBacktestResult();
    if (cached) setResult(cached);
  }, []);

  async function handleStart() {
    if (running) {
      abortRef.current?.abort();
      setRunning(false);
      return;
    }
    abortRef.current = new AbortController();
    setRunning(true);
    setProgress({ done: 0, total: allRounds.length - 20 });
    try {
      const res = await runBacktest(
        allRounds,
        gamesPerMode,
        (done, total) => setProgress({ done, total }),
        abortRef.current.signal
      );
      setResult(res);
      saveBacktestResult(res);
    } finally {
      setRunning(false);
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const chartData = result
    ? result.modeStats.map((s) => ({
        name: s.label.replace(" ", "\n"),
        "3개": s.exact3,
        "4개": s.exact4,
        "5개+": s.exact5 + s.exact6,
      }))
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900">전략 검증</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        1~{allRounds.length}회차 역대 데이터로 7개 생성 모드를 시뮬레이션해
        어떤 전략이 실제 당첨번호에 가장 근접했는지 검증합니다
      </p>

      {/* Settings card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="font-semibold text-gray-800 text-sm mb-3">회차당 모드별 생성 게임 수</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {GAMES_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGamesPerMode(opt.value)}
              disabled={running}
              className={`border-2 rounded-xl py-2.5 px-3 text-center transition-all ${
                gamesPerMode === opt.value
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-gray-100 text-gray-500 hover:border-gray-200"
              } disabled:opacity-50`}
            >
              <p className="font-bold text-sm">{opt.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl px-3 py-2 mb-4 text-xs text-gray-500 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span>
            총 <span className="font-semibold text-gray-700">{((allRounds.length - 20) * 7 * gamesPerMode).toLocaleString()}</span>게임 분석
            · 7개 모드 × {gamesPerMode}게임 × {allRounds.length - 20}회차
          </span>
        </div>

        <motion.button
          onClick={handleStart}
          whileTap={{ scale: 0.97 }}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            running
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90"
          }`}
        >
          {running ? (
            <><Square className="w-4 h-4" />시뮬레이션 중지</>
          ) : (
            <><Play className="w-4 h-4" />시뮬레이션 시작</>
          )}
        </motion.button>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-amber-100 p-4 mb-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">분석 진행 중...</p>
              <p className="text-sm font-bold text-amber-500">{pct}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
              <motion.div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {progress.done.toLocaleString()} / {progress.total.toLocaleString()} 회차 완료
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !running && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Summary */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <p className="font-bold text-amber-800 text-sm">시뮬레이션 완료</p>
                <span className="ml-auto text-[10px] text-amber-600">{formatDate(result.runAt)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-extrabold text-amber-700">{result.completedRounds}</p>
                  <p className="text-[10px] text-amber-600">분석 회차</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-amber-700">
                    {(result.completedRounds * 7 * result.gamesPerMode).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-amber-600">총 분석 게임</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-amber-700">{result.gamesPerMode}게임</p>
                  <p className="text-[10px] text-amber-600">모드별 회차당</p>
                </div>
              </div>
            </div>

            {/* Mode ranking */}
            <div className="mb-4">
              <p className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                모드 성과 순위
              </p>
              <div className="space-y-3">
                {result.modeStats.map((stats, rank) => (
                  <ModeRankCard key={stats.mode} stats={stats} rank={rank} />
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <p className="font-bold text-gray-800 text-sm mb-4">번호 일치 분포 차트</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()}회`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="3개" stackId="a" fill="#FCD34D" name="3개 일치" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="4개" stackId="a" fill="#60A5FA" name="4개 일치" />
                  <Bar dataKey="5개+" stackId="a" fill="#A78BFA" name="5개+ 일치" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 text-center mt-1">
                점수 = 3개×1 + 4개×5 + 5개×25 + 6개×200
              </p>
            </div>

            {/* Hall of Fame */}
            {result.hallOfFame.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <button
                  onClick={() => setShowHof((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <p className="font-bold text-gray-800 text-sm">명예의 전당</p>
                    <span className="text-xs text-gray-400">4개+ 일치 최고 조합</span>
                  </div>
                  {showHof ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {showHof && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-50 space-y-2 pt-3">
                        {result.hallOfFame.map((entry, i) => (
                          <HallOfFameCard key={i} entry={entry} allRounds={allRounds} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Re-run button */}
            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />다시 실행
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !running && (
        <div className="text-center py-16 text-gray-300">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">시뮬레이션을 시작하면</p>
          <p className="text-sm">모드별 성과 데이터가 여기에 표시됩니다</p>
        </div>
      )}
    </div>
  );
}
