import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Crown, RotateCcw, Share2, X } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import LottoKingGuideSheet from "@/components/LottoKingGuideSheet";
import PageCard from "@/components/PageCard";
import PageGuideBar from "@/components/PageGuideBar";
import SavedSourceList from "@/components/SavedSourceList";
import SaveNumbersButton from "@/components/SaveNumbersButton";
import SendToSlipButton from "@/components/SendToSlipButton";
import { useLottoContext } from "@/context/LottoDataContext";
import type { GeneratedNumbers } from "@/data/types";
import { analyzeLottoKingWindow, generateLottoKingHybrid, getCoverageStats } from "@/utils/lottoKing";
import { formatPercent, probAtLeastOne3Plus } from "@/utils/lottoProbability";
import { getRoundTag, isDuplicateNumberSets, saveNumberSets } from "@/utils/savedNumbers";
import { useSavedSets } from "@/hooks/useSavedSets";

const GAME_COUNT = 5;
const KING_COUNT = 4;
const COVER_COUNT = 1;

function getScore(item: GeneratedNumbers): number {
  return typeof item.score === "number" ? item.score : 0;
}

function StatBar({ label, count, pct, accent = false }: { label: string; count: number; pct: number; accent?: boolean }) {
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

export default function LottoKing() {
  const { allRounds, latestRound } = useLottoContext();
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { sets: existingSets, setSets: setExistingSets } = useSavedSets();
  const resultRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(() => analyzeLottoKingWindow(allRounds, 20), [allRounds]);

  const coverage = useMemo(() => getCoverageStats(results), [results]);
  const expected5th = useMemo(() => probAtLeastOne3Plus(results.length || GAME_COUNT), [results.length]);

  function handleGenerate() {
    setGenerating(true);
    setResults([]);
    setSaved(false);
    setSaveError(null);
    setIsDuplicate(false);

    setTimeout(async () => {
      try {
        const generated = generateLottoKingHybrid(allRounds, GAME_COUNT);
        setResults(generated);
        setIsDuplicate(await isDuplicateNumberSets(generated, existingSets));
      } catch (err) {
        setSaveError(
          err instanceof Error ? `생성 실패 · ${err.message}` : "생성 실패 · 다시 시도",
        );
        setResults([]);
      } finally {
        setGenerating(false);
      }
    }, 80);
  }

  async function handleSave() {
    if (results.length === 0 || saved || isDuplicate) return;
    setSaveError(null);
    if (results.length !== GAME_COUNT) {
      setSaveError(`게임 수가 ${results.length}개입니다. 다시 생성해 주세요. (목표 ${GAME_COUNT}게임)`);
      return;
    }
    const result = await saveNumberSets(results, `소원 ${GAME_COUNT}게임`);
    if (result.ok) {
      setSaved(true);
      setExistingSets((prev) => [result.set, ...prev]);
      return;
    }
    setSaveError(result.error);
  }

  async function handleShare() {
    const text = results
      .map((r, i) => `${String(i + 1).padStart(2, "0")}. ${r.numbers.join(", ")} ${r.summary ?? ""}`)
      .join("\n");
    const shareText = `${getRoundTag()} 소원 ${GAME_COUNT}게임 추천\n\n${text}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `소원 ${GAME_COUNT}게임 추천`, text: shareText });
      } catch {
        await navigator.clipboard.writeText(shareText);
        alert("클립보드에 복사되었습니다!");
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert("클립보드에 복사되었습니다!");
    }
  }

  async function handleSaveImage() {
    if (!resultRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(resultRef.current, { backgroundColor: "#fff", scale: 2, useCORS: true });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `lottoking_10_${Date.now()}.png`;
      a.click();
    } catch {
      alert("이미지 저장 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="page-content">
      <PageGuideBar
        tag={getRoundTag()}
        guideLabel="소원 설명"
        onGuide={() => setShowGuide(true)}
      />

      <LottoKingGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />

      <PageCard className="!p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">생성 게임</p>
          <p className="text-2xl font-extrabold text-gray-900">
            {results.length > 0 ? results.length : GAME_COUNT}게임
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">기준 구간</p>
          <p className="text-xl font-extrabold text-gray-800">최근 20회</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">구성</p>
          <p className="text-lg font-extrabold text-gray-900">
            패턴 {KING_COUNT} + 커버 {COVER_COUNT}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">번호 커버</p>
          <p className="text-2xl font-extrabold text-emerald-600">
            {results.length > 0 ? `${coverage.coveragePct}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">5등↑ 기대*</p>
          <p className="text-2xl font-extrabold text-gray-900">
            {formatPercent(expected5th)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">최근 반영</p>
          <p className="text-2xl font-extrabold text-gray-900">{latestRound ? `${latestRound.drwNo}회` : "-"}</p>
        </div>
        </div>
      </PageCard>

      {analysis && (
        <PageCard>
          <h3 className="text-sm font-bold text-gray-800 mb-3">최근 {analysis.windowSize}회 분석 (소원 기준)</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">직전 회차 번호 중복</p>
              <div className="space-y-1.5">
                {analysis.overlapStats.map((s) => (
                  <StatBar key={s.label} label={s.label} count={s.count} pct={s.pct} accent={s.label === "1개" || s.label === "2개"} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">연번 출현</p>
              <div className="space-y-1.5">
                {analysis.consecutiveStats.map((s) => (
                  <StatBar key={s.label} label={s.label} count={s.count} pct={s.pct} accent={s.label === "1쌍"} />
                ))}
              </div>
              <p className="text-caption text-gray-400 mt-2">3연번 이상: {analysis.threePlusRunPct}%</p>
              {analysis.consecZoneStats.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">연번 구간 분포</p>
                  <div className="space-y-1.5">
                    {analysis.consecZoneStats.map((s) => (
                      <StatBar key={s.label} label={s.label} count={s.count} pct={s.pct} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              {analysis.lastRoundNo}회 당첨번호 — 직전 반복 비율
            </p>
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
          </div>
        </PageCard>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || allRounds.length === 0}
        className="page-cta page-cta--dark w-full mb-4 disabled:opacity-50"
      >
        {generating ? (
          <>
            <RotateCcw className="w-5 h-5 animate-spin" />
            소원 분석 중...
          </>
        ) : allRounds.length === 0 ? (
          <>
            <X className="w-5 h-5" />
            로또 데이터를 불러오는 중입니다
          </>
        ) : (
          <>
            <Crown className="w-5 h-5" />
            소원 {GAME_COUNT}게임 생성하기
          </>
        )}
      </button>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {saveError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="space-y-3 mb-4">
              <SaveNumbersButton
                onClick={() => void handleSave()}
                saved={saved}
                isDuplicate={isDuplicate}
                tone="amber"
              />
              <SendToSlipButton games={results} source="king" />
              <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleShare}
                className="page-cta page-cta--secondary px-4"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSaveImage}
                className="page-cta page-cta--secondary px-4"
              >
                <Download className="w-4 h-4" />
              </button>
              </div>
            </div>

            <PageCard>
            <div ref={resultRef} className="space-y-2">
              {results.length > 0 && (
                <div className={`rounded-xl px-3 py-2 text-xs mb-2 ${
                  coverage.coveragePct >= 100
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                    : coverage.coveragePct >= 90
                      ? "bg-gray-50 text-gray-800 border border-gray-200"
                      : "bg-gray-50 text-gray-600 border border-gray-100"
                }`}>
                  45개 번호 중 <strong>{coverage.coveredCount}개</strong> 포함 ({coverage.coveragePct}%)
                  {coverage.missing.length > 0 && (
                    <span className="block mt-1 text-caption opacity-80">
                      미포함: {coverage.missing.join(", ")}
                    </span>
                  )}
                </div>
              )}
              {results.map((r, idx) => {
                const detail = r.lottokingDetail;
                const repeatSet = new Set(detail?.repeatFromLast ?? []);
                const prev2Set = new Set(detail?.repeatFromPrev2 ?? []);
                const isCover = r.summary?.startsWith("커버") ?? false;
                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-xl border p-3 ${isCover ? "border-emerald-100" : "border-gray-100"}`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base font-bold text-gray-700">#{idx + 1}</span>
                        {isCover ? (
                          <span className="text-caption font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            45번호 커버
                          </span>
                        ) : (
                          detail?.profileLabel && (
                            <span className="text-caption font-semibold text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">
                              {detail.profileLabel}
                            </span>
                          )
                        )}
                      </div>
                      <span className="text-xs text-gray-400 text-right truncate">{r.summary}</span>
                    </div>
                    <div className="ball-row ball-row--fluid mb-2">
                      {r.numbers.map((n, i) => (
                        <LottoBall
                          key={i}
                          number={n}
                          size="sm"
                          highlight={repeatSet.has(n) || prev2Set.has(n)}
                        />
                      ))}
                    </div>
                    {detail && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-gray-500">
                        <span>
                          직전 반복:{" "}
                          <span className="font-medium text-gray-700">
                            {detail.repeatFromLast.length > 0 ? detail.repeatFromLast.join(", ") : "없음"}
                          </span>
                        </span>
                        <span>
                          2회전 반복:{" "}
                          <span className="font-medium text-orange-600">
                            {(detail.repeatFromPrev2?.length ?? 0) > 0
                              ? detail.repeatFromPrev2!.join(", ")
                              : "없음"}
                          </span>
                        </span>
                        <span>
                          연번:{" "}
                          <span className="font-medium text-gray-700">
                            {detail.consecutiveRanges.length > 0 ? detail.consecutiveRanges.join(", ") : "없음"}
                            {detail.consecZoneLabel ? ` (${detail.consecZoneLabel})` : ""}
                          </span>
                        </span>
                        <span>점수 {getScore(r)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </PageCard>
          </motion.div>
        )}
      </AnimatePresence>

      <SavedSourceList source="king" title="저장된 소원 번호" />
    </div>
  );
}
