import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import PatternAnalysisChart from "@/components/PatternAnalysisChart";
import { useLottoContext } from "@/context/LottoDataContext";
import {
  getFrequency,
  getSumDistribution,
  getOddEvenRatio,
  getHighLowRatio,
} from "@/utils/analysis";

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

const PIE_COLORS = [
  "#F59E0B",
  "#3B82F6",
  "#EF4444",
  "#22C55E",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

const PERIODS = [
  { key: 200, label: "최근 200회" },
  { key: 0, label: "전체" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const TABS = [
  { key: "pattern", label: "패턴분석표" },
  { key: "freq", label: "자주 나온 번호" },
  { key: "sum", label: "번호 합계" },
  { key: "oddeven", label: "홀·짝" },
  { key: "highlow", label: "낮은·높은" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function NumberAnalysisPanel() {
  const { allRounds, status } = useLottoContext();
  const [tab, setTab] = useState<TabKey>("pattern");
  const [period, setPeriod] = useState<PeriodKey>(200);

  const recentRounds = useMemo(() => {
    if (period === 0) return allRounds;
    return [...allRounds].sort((a, b) => b.drwNo - a.drwNo).slice(0, period);
  }, [allRounds, period]);

  const freq = useMemo(() => getFrequency(recentRounds), [recentRounds]);
  const sumDist = useMemo(() => getSumDistribution(recentRounds), [recentRounds]);
  const oddEven = useMemo(() => getOddEvenRatio(recentRounds), [recentRounds]);
  const highLow = useMemo(() => getHighLowRatio(recentRounds), [recentRounds]);

  const topFreq = useMemo(
    () => [...freq].sort((a, b) => b.count - a.count).slice(0, 10),
    [freq],
  );
  const botFreq = useMemo(
    () => [...freq].sort((a, b) => a.count - b.count).slice(0, 10),
    [freq],
  );

  return (
    <div className="space-y-4">
      {status === "loading" && (
        <p className="text-gray-700 text-base font-medium">데이터 불러오는 중…</p>
      )}

      {tab !== "pattern" ? (
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`py-3 rounded-xl text-base font-bold transition-colors ${
                period === p.key
                  ? "bg-ink text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`py-3 px-2 rounded-xl text-base font-bold transition-colors ${
              tab === t.key
                ? "bg-gray-100 text-gray-800 border-2 border-gray-400"
                : "bg-white border border-gray-200 text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pattern" && <PatternAnalysisChart />}

      {tab === "freq" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg mb-3">
              번호별 출현 횟수
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={freq} margin={{ left: -20 }}>
                <XAxis dataKey="number" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}회`, "출현"]}
                  labelFormatter={(l) => `${l}번`}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {freq.map((entry) => (
                    <Cell key={entry.number} fill={getBallColor(entry.number)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 justify-center flex-wrap">
              {Object.entries(BALL_COLORS).map(([range, color]) => (
                <div key={range} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
                  {range}번
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <FreqList title="많이 나온 번호 TOP 10" items={topFreq} barColor="bg-gray-500" />
            <FreqList title="적게 나온 번호 TOP 10" items={botFreq} barColor="bg-blue-400" />
          </div>
        </div>
      )}

      {tab === "sum" && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <h3 className="font-bold text-gray-900 text-lg mb-1">당첨번호 합계 분포</h3>
          <p className="text-sm text-gray-500 mb-3 leading-relaxed">
            주황색 구간(110~179)에 당첨번호가 가장 많이 모여 있습니다.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sumDist} margin={{ left: -15 }}>
              <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [`${v}회`, "당첨"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sumDist.map((entry, i) => (
                  <Cell key={i} fill={entry.isHighlight ? "#F59E0B" : "#CBD5E1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "oddeven" && (
        <RatioPanel title="홀짝 비율" data={oddEven} note="6개 번호 중 홀·짝 개수 조합" />
      )}

      {tab === "highlow" && (
        <RatioPanel
          title="낮은·높은 번호 비율"
          data={highLow}
          note="낮은 번호 1~23, 높은 번호 24~45"
        />
      )}
    </div>
  );
}

function FreqList({
  title,
  items,
  barColor,
}: {
  title: string;
  items: { number: number; count: number; percentage: number }[];
  barColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
      <h3 className="font-bold text-gray-900 text-base mb-3">{title}</h3>
      <div className="space-y-2.5">
        {items.map((f, i) => (
          <div key={f.number} className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-5 font-semibold">{i + 1}</span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
              style={{ background: getBallColor(f.number) }}
            >
              {f.number}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${barColor}`}
                style={{ width: `${f.percentage}%`, minWidth: "4px" }}
              />
            </div>
            <span className="text-sm text-gray-700 w-12 text-right font-semibold">
              {f.count}회
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatioPanel({
  title,
  data,
  note,
}: {
  title: string;
  data: { label: string; count: number; percentage: number }[];
  note: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm space-y-3">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{note}</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ label, percentage }) => `${label} (${percentage}%)`}
            labelLine
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v}회`, "당첨"]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 w-28">{d.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full"
                style={{
                  width: `${d.percentage}%`,
                  background: PIE_COLORS[i % PIE_COLORS.length],
                }}
              />
            </div>
            <span className="text-sm text-gray-600 w-14 text-right font-semibold">
              {d.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
