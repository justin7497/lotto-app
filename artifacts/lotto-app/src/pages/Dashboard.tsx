import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, ChevronRight, AlertCircle, Bookmark, Clock } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import { useLottoContext } from "@/context/LottoDataContext";
import { getNumbers, getFrequency, getRecentTrend } from "@/utils/analysis";
import { loadSavedSets, parseRoundNo, checkWinResult } from "@/utils/savedNumbers";
import type { SavedSet, WinResult } from "@/utils/savedNumbers";
import type { LottoRound } from "@/data/types";

const RANK_STYLE: Record<string, string> = {
  "1": "bg-yellow-400 text-yellow-900 border-yellow-500",
  "2": "bg-orange-400 text-white border-orange-500",
  "3": "bg-purple-500 text-white border-purple-600",
  "4": "bg-blue-400 text-white border-blue-500",
  "5": "bg-emerald-400 text-white border-emerald-500",
};

function WinBadge({ result }: { result: WinResult }) {
  if (result.rank === null) {
    return (
      <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 whitespace-nowrap">
        낙첨
      </span>
    );
  }
  const style = RANK_STYLE[String(result.rank)] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap ${style}`}>
      {result.label}
    </span>
  );
}

function SavedNumbersPreview({ sets, roundMap }: { sets: SavedSet[]; roundMap: Map<number, LottoRound> }) {
  const preview = sets.slice(0, 2);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-800">최근 저장 번호 당첨 결과</h3>
        </div>
        <Link href="/my-numbers" className="text-amber-500 text-sm font-medium flex items-center gap-1 hover:text-amber-600">
          나의 번호 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">저장된 번호가 없습니다</p>
      ) : (
        <div className="space-y-4">
          {preview.map((saved) => {
            const roundNo = parseRoundNo(saved.roundTag);
            const round = roundNo !== null ? (roundMap.get(roundNo) ?? null) : null;
            const winningSet = round
              ? new Set([round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6])
              : null;

            return (
              <div key={saved.id} className="border border-gray-50 rounded-xl p-3 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                    {saved.roundTag}
                  </span>
                  {!round && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 결과 대기 중
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {saved.sets.map((s, idx) => {
                    const result = round ? checkWinResult(s.numbers, round) : null;
                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-300 w-4 text-right shrink-0">{idx + 1}</span>
                        <div className="flex gap-1 flex-wrap">
                          {s.numbers.map((n, i) => {
                            const isMatch = winningSet ? winningSet.has(n) : false;
                            return (
                              <div key={i} className={`rounded-full transition-all ${isMatch ? "ring-2 ring-offset-1 ring-yellow-400" : ""}`}>
                                <LottoBall number={n} size="sm" />
                              </div>
                            );
                          })}
                        </div>
                        {result ? (
                          <WinBadge result={result} />
                        ) : (
                          <span className="text-[10px] text-gray-300">결과 대기 중</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { allRounds, latestRound, status, updateMsg, updateFailed } = useLottoContext();
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);

  useEffect(() => {
    loadSavedSets().then(setSavedSets);
  }, []);

  const roundMap = useMemo(() => {
    const map = new Map<number, LottoRound>();
    for (const r of allRounds) map.set(r.drwNo, r);
    return map;
  }, [allRounds]);

  const { mostFreq, leastFreq, absentNums, hotNums } = useMemo(() => {
    if (allRounds.length === 0) return { mostFreq: [], leastFreq: [], absentNums: [], hotNums: [] };
    const freq = getFrequency(allRounds);
    const sorted = [...freq].sort((a, b) => b.count - a.count);
    const trend = getRecentTrend(allRounds, 10);
    return {
      mostFreq: sorted.slice(0, 10),
      leastFreq: sorted.slice(-10).reverse(),
      absentNums: trend.filter((t) => !t.appearsInLast10).sort((a, b) => a.lastSeen - b.lastSeen).slice(0, 10),
      hotNums: trend.filter((t) => t.countInLast10 >= 2).sort((a, b) => b.countInLast10 - a.countInLast10).slice(0, 10),
    };
  }, [allRounds]);

  const recent5 = useMemo(() => [...allRounds].sort((a, b) => b.drwNo - a.drwNo).slice(0, 5), [allRounds]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      {/* Status bar */}
      {(status === "loading" || updateMsg) && (
        <div className={`mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
          status === "loading"
            ? "text-amber-700 bg-amber-50 border-amber-200"
            : updateFailed
            ? "text-red-700 bg-red-50 border-red-200"
            : "text-green-700 bg-green-50 border-green-200"
        }`}>
          {status === "loading"
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : updateFailed
            ? <AlertCircle className="w-4 h-4" />
            : <RefreshCw className="w-4 h-4" />}
          {status === "loading" ? "최신 당첨번호 업데이트 중..." : updateMsg}
        </div>
      )}

      {/* Latest draw */}
      {latestRound && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 sm:p-6 mb-6 shadow-sm border border-gray-100 text-gray-900"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-amber-500 text-sm font-medium">최신 당첨번호</p>
              <p className="text-gray-900 font-bold text-2xl">{latestRound.drwNo}회차</p>
              <p className="text-gray-400 text-xs mt-0.5">{latestRound.drwNoDate}</p>
            </div>
            <div className="bg-amber-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-white">1등 당첨</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getNumbers(latestRound).map((n, i) => (
              <LottoBall key={i} number={n} size="xl" animate delay={i * 0.08} />
            ))}
            <span className="text-gray-300 text-xl font-light mx-1">+</span>
            <LottoBall number={latestRound.bnusNo} size="xl" isBonus animate delay={0.5} />
          </div>
          <p className="text-gray-400 text-xs mt-3">보너스 번호 (금테 표시)</p>
        </motion.div>
      )}

      {/* Saved numbers preview */}
      <SavedNumbersPreview sets={savedSets} roundMap={roundMap} />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="분석 회차" value={`${allRounds.length}회`} sub="1회 ~ 최신" color="amber" />
        <StatCard label="출현 번호 수" value="45개" sub="1번 ~ 45번" color="blue" />
        <StatCard label="데이터 수집" value={`${allRounds.length * 6}개`} sub="총 당첨번호" color="green" />
        <StatCard label="평균 합계" value={allRounds.length > 0 ? String(Math.round(allRounds.map(r => getNumbers(r).reduce((a,b)=>a+b,0)).reduce((a,b)=>a+b,0)/allRounds.length)) : "-"} sub="적정범위 110~180" color="purple" />
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {/* Hot numbers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-gray-800">최근 10회 자주 나온 번호</h3>
          </div>
          {hotNums.length === 0 ? (
            <p className="text-gray-400 text-sm">데이터 로딩 중...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hotNums.map((t) => (
                <div key={t.number} className="flex flex-col items-center gap-0.5">
                  <LottoBall number={t.number} size="sm" />
                  <span className="text-[10px] text-red-500 font-medium">{t.countInLast10}회</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cold numbers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-800">최근 10회 미출현 번호</h3>
          </div>
          {absentNums.length === 0 ? (
            <p className="text-gray-400 text-sm">데이터 로딩 중...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {absentNums.map((t) => (
                <div key={t.number} className="flex flex-col items-center gap-0.5">
                  <LottoBall number={t.number} size="sm" />
                  <span className="text-[10px] text-blue-500 font-medium">{t.lastSeen}회</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent 5 rounds */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">최근 당첨번호</h3>
          <Link href="/analysis" className="text-amber-500 text-sm font-medium flex items-center gap-1 hover:text-amber-600">
            통계 보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {recent5.map((r) => (
            <div key={r.drwNo} className="flex items-center gap-3">
              <div className="text-xs text-gray-400 w-14 shrink-0 text-right">
                <div className="font-semibold text-gray-600">{r.drwNo}회</div>
                <div>{r.drwNoDate}</div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {getNumbers(r).map((n, i) => (
                  <LottoBall key={i} number={n} size="sm" />
                ))}
                <span className="text-gray-300 text-sm flex items-center">+</span>
                <LottoBall number={r.bnusNo} size="sm" isBonus />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 leading-relaxed">
        ⚠️ 로또는 완전한 무작위 추첨입니다. 본 서비스의 번호 추천은 통계 분석이며 당첨을 보장하지 않습니다.
      </p>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    green: "bg-green-50 border-green-100 text-green-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}
