import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { useLottoContext } from "@/context/LottoDataContext";
import { getFrequency, getSumDistribution, getOddEvenRatio, getHighLowRatio } from "@/utils/analysis";

const BALL_COLORS: Record<string, string> = {
  "1-10": "#FACC15",
  "11-20": "#3B82F6",
  "21-30": "#EF4444",
  "31-40": "#6B7280",
  "41-45": "#22C55E",
};

function getBallColor(num: number): string {
  if (num <= 10) return "#FACC15";
  if (num <= 20) return "#3B82F6";
  if (num <= 30) return "#EF4444";
  if (num <= 40) return "#6B7280";
  return "#22C55E";
}

const PIE_COLORS = ["#F59E0B", "#3B82F6", "#EF4444", "#22C55E", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

const PERIODS = [
  { key: 200, label: "최근 200회 (중기)" },
  { key: 0, label: "전체 회차" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

export default function Analysis() {
  const { allRounds, status } = useLottoContext();
  const [tab, setTab] = useState<"freq" | "sum" | "oddeven" | "highlow">("freq");
  const [period, setPeriod] = useState<PeriodKey>(200);

  const recentRounds = useMemo(() => {
    if (period === 0) return allRounds;
    return [...allRounds].sort((a, b) => b.drwNo - a.drwNo).slice(0, period);
  }, [allRounds, period]);

  const freq = useMemo(() => getFrequency(recentRounds), [recentRounds]);
  const sumDist = useMemo(() => getSumDistribution(recentRounds), [recentRounds]);
  const oddEven = useMemo(() => getOddEvenRatio(recentRounds), [recentRounds]);
  const highLow = useMemo(() => getHighLowRatio(recentRounds), [recentRounds]);

  const topFreq = useMemo(() => [...freq].sort((a, b) => b.count - a.count).slice(0, 10), [freq]);
  const botFreq = useMemo(() => [...freq].sort((a, b) => a.count - b.count).slice(0, 10), [freq]);

  const TABS = [
    { key: "freq", label: "출현 빈도" },
    { key: "sum", label: "합계 분포" },
    { key: "oddeven", label: "홀짝 비율" },
    { key: "highlow", label: "고저 비율" },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">통계 분석</h2>
      {status === "loading" && (
        <p className="text-amber-600 text-sm mb-4">데이터 업데이트 중...</p>
      )}

      {/* Tabs + Period toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-amber-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                period === p.key
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency */}
      {tab === "freq" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">
              번호별 출현 빈도 ({period === 0 ? `전체 ${allRounds.length}회` : `최근 ${period}회`})
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={freq} margin={{ left: -20 }}>
                <XAxis dataKey="number" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}회`, "출현 횟수"]}
                  labelFormatter={(l) => `${l}번`}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {freq.map((entry) => (
                    <Cell key={entry.number} fill={getBallColor(entry.number)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center flex-wrap">
              {Object.entries(BALL_COLORS).map(([range, color]) => (
                <div key={range} className="flex items-center gap-1 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  {range}번
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">많이 나온 번호 TOP 10</h3>
              <div className="space-y-2">
                {topFreq.map((f, i) => (
                  <div key={f.number} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: getBallColor(f.number) }}>
                      {f.number}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-amber-400" style={{ width: `${f.percentage}%`, minWidth: "4px" }} />
                    </div>
                    <span className="text-xs text-gray-600 w-10 text-right">{f.count}회</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">적게 나온 번호 BOTTOM 10</h3>
              <div className="space-y-2">
                {botFreq.map((f, i) => (
                  <div key={f.number} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: getBallColor(f.number) }}>
                      {f.number}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-400" style={{ width: `${f.percentage}%`, minWidth: "4px" }} />
                    </div>
                    <span className="text-xs text-gray-600 w-10 text-right">{f.count}회</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sum distribution */}
      {tab === "sum" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-1">당첨번호 합계 분포</h3>
          <p className="text-xs text-gray-500 mb-4">강조(주황) 구간: 110~179 — 과거 당첨번호의 약 70%가 이 범위에 분포</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sumDist} margin={{ left: -15 }}>
              <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v}회`, "당첨 수"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sumDist.map((entry, i) => (
                  <Cell key={i} fill={entry.isHighlight ? "#F59E0B" : "#CBD5E1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Odd/Even */}
      {tab === "oddeven" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">홀짝 비율 분포</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={oddEven} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, percentage }) => `${label} (${percentage}%)`} labelLine>
                  {oddEven.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}회`, "당첨 수"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">홀짝 비율 순위</h3>
            <div className="space-y-2">
              {oddEven.map((d, i) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-700 w-24">{d.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${d.percentage}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* High/Low */}
      {tab === "highlow" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">고저 비율 분포</h3>
            <p className="text-xs text-gray-500 mb-3">저번호: 1~23, 고번호: 24~45</p>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={highLow} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={85} label={({ label, percentage }) => `${label} (${percentage}%)`} labelLine>
                  {highLow.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}회`, "당첨 수"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">고저 비율 순위</h3>
            <div className="space-y-2">
              {highLow.map((d, i) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-700 w-24">{d.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${d.percentage}%`, background: PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
