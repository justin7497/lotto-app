import { BarChart3, X } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import type { LottoKingAnalysis } from "@/utils/lottoKing";

function StatBar({
  label,
  count,
  pct,
  accent = false,
}: {
  label: string;
  count: number;
  pct: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-10 shrink-0 font-medium ${accent ? "text-gray-700" : "text-gray-500"}`}>{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${accent ? "bg-gray-500" : "bg-gray-300"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-gray-500 tabular-nums">
        {count}회 ({pct}%)
      </span>
    </div>
  );
}

export default function LottoKingAnalysisSheet({
  open,
  analysis,
  onClose,
}: {
  open: boolean;
  analysis: LottoKingAnalysis | null;
  onClose: () => void;
}) {
  const closeSheet = useOverlayBack(open, onClose);
  if (!open || !analysis) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={closeSheet}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="최근 회차 분석"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 className="w-6 h-6 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-lg text-gray-900">최근 {analysis.windowSize}회 분석</h3>
          </div>
          <button
            type="button"
            onClick={closeSheet}
            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            소원 추천에 반영되는 최근 당첨 패턴 통계입니다. 직전 회차 중복·연번 경향을 참고해 번호를 조합합니다.
          </p>

          <section>
            <h4 className="text-sm font-bold text-gray-800 mb-2">직전 회차 번호 중복</h4>
            <div className="space-y-1.5">
              {analysis.overlapStats.map((s) => (
                <StatBar
                  key={s.label}
                  label={s.label}
                  count={s.count}
                  pct={s.pct}
                  accent={s.label === "1개" || s.label === "2개"}
                />
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold text-gray-800 mb-2">연번 출현</h4>
            <div className="space-y-1.5">
              {analysis.consecutiveStats.map((s) => (
                <StatBar
                  key={s.label}
                  label={s.label}
                  count={s.count}
                  pct={s.pct}
                  accent={s.label === "1쌍"}
                />
              ))}
            </div>
            <p className="text-caption text-gray-400 mt-2">3연번 이상: {analysis.threePlusRunPct}%</p>
            {analysis.consecZoneStats.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">연번 구간 분포</p>
                <div className="space-y-1.5">
                  {analysis.consecZoneStats.map((s) => (
                    <StatBar key={s.label} label={s.label} count={s.count} pct={s.pct} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section>
            <h4 className="text-sm font-bold text-gray-800 mb-2">
              {analysis.lastRoundNo}회 당첨번호 — 직전 반복 비율
            </h4>
            <div className="ball-row ball-row--fluid">
              {analysis.lastRoundNumbers.map((n) => (
                <LottoBall key={n} number={n} size="sm" />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              {analysis.numberRepeatRates.map(({ number, rate }) => (
                <span key={number}>
                  <span className="font-semibold text-gray-700">{number}</span> {rate}%
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
