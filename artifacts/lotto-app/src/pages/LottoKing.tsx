import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Minus, Plus, RotateCcw, X } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import LottoKingAnalysisSheet from "@/components/LottoKingAnalysisSheet";
import LottoKingGuideSheet from "@/components/LottoKingGuideSheet";
import PageCard from "@/components/PageCard";
import PageGuideBar from "@/components/PageGuideBar";
import {
  RecommendFooterSaveActions,
  RecommendStickyFooter,
} from "@/components/RecommendSaveActions";
import { useLottoContext } from "@/context/LottoDataContext";
import type { GeneratedNumbers } from "@/data/types";
import { analyzeLottoKingWindow, generateLottoKingHybrid, getCoverageStats } from "@/utils/lottoKing";
import { autoSaveGeneratedSets } from "@/utils/autoSaveNumbers";
import { formatPercent, probAtLeastOne3Plus } from "@/utils/lottoProbability";
import { getRoundTag, isDuplicateNumberSets, fillUniqueForWeek } from "@/utils/savedNumbers";
import { useSavedSets } from "@/hooks/useSavedSets";

const DEFAULT_GAME_COUNT = 5;
const MIN_GAME_COUNT = 1;
const MAX_GAME_COUNT = 10;

function getLottoKingComposition(gameCount: number) {
  const patternCount = Math.min(6, gameCount);
  const coverCount = Math.max(0, gameCount - patternCount);
  return { patternCount, coverCount };
}

function getScore(item: GeneratedNumbers): number {
  return typeof item.score === "number" ? item.score : 0;
}

export default function LottoKing() {
  const { allRounds, latestRound } = useLottoContext();
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [gameCount, setGameCount] = useState(DEFAULT_GAME_COUNT);
  const { sets: existingSets, setSets: setExistingSets } = useSavedSets();

  const composition = useMemo(() => getLottoKingComposition(gameCount), [gameCount]);
  const canEditGameCount = !generating;

  const analysis = useMemo(() => analyzeLottoKingWindow(allRounds, 20), [allRounds]);

  const coverage = useMemo(() => getCoverageStats(results), [results]);
  const expected5th = useMemo(
    () => probAtLeastOne3Plus(results.length || gameCount),
    [results.length, gameCount],
  );

  function changeGameCount(next: number) {
    const clamped = Math.min(MAX_GAME_COUNT, Math.max(MIN_GAME_COUNT, next));
    setGameCount(clamped);
    if (results.length > 0) {
      setResults([]);
      setSaved(false);
      setSaveError(null);
      setIsDuplicate(false);
    }
  }

  function handleGenerate() {
    setGenerating(true);
    setResults([]);
    setSaved(false);
    setSaveError(null);
    setIsDuplicate(false);

    setTimeout(async () => {
      try {
        const factory = () => generateLottoKingHybrid(allRounds, 1)[0];
        const generated = fillUniqueForWeek(
          generateLottoKingHybrid(allRounds, gameCount),
          gameCount,
          factory,
          existingSets,
        );
        setResults(generated);
        const dup = await isDuplicateNumberSets(generated, existingSets);
        setIsDuplicate(dup);
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
    const dup = await isDuplicateNumberSets(results, existingSets);
    if (dup) {
      setIsDuplicate(true);
      return;
    }
    const saveResult = await autoSaveGeneratedSets(results, `행운 · 패턴번호 ${results.length}게임`);
    if (saveResult.status === "saved") {
      setSaved(true);
      setExistingSets((prev) => [saveResult.set, ...prev]);
    } else if (saveResult.status === "duplicate") {
      setIsDuplicate(true);
    } else if (saveResult.status === "error") {
      setSaveError(saveResult.message);
    }
  }

  return (
    <div className="page-content page-content--generator">
      <PageGuideBar
        tag={getRoundTag()}
        guideLabel="방식 설명"
        onGuide={() => setShowGuide(true)}
        analysisLabel="최근 분석"
        onAnalysis={() => setShowAnalysis(true)}
      />

      <LottoKingGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />
      <LottoKingAnalysisSheet
        open={showAnalysis}
        analysis={analysis}
        onClose={() => setShowAnalysis(false)}
      />

      <PageCard className="!p-3 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">생성 게임</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => changeGameCount(gameCount - 1)}
              disabled={!canEditGameCount || gameCount <= MIN_GAME_COUNT}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-35"
              aria-label="게임 수 줄이기"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-2xl font-extrabold text-gray-900 min-w-[3.5rem] text-center">
              {results.length > 0 ? results.length : gameCount}게임
            </span>
            <button
              type="button"
              onClick={() => changeGameCount(gameCount + 1)}
              disabled={!canEditGameCount || gameCount >= MAX_GAME_COUNT}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-35"
              aria-label="게임 수 늘리기"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[0.68rem] text-gray-400 mt-1">
            {MIN_GAME_COUNT}~{MAX_GAME_COUNT}게임
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">기준 구간</p>
          <p className="text-xl font-extrabold text-gray-800">최근 20회</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">구성</p>
          <p className="text-lg font-extrabold text-gray-900">
            패턴 {composition.patternCount}
            {composition.coverCount > 0 ? ` + 커버 ${composition.coverCount}` : ""}
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

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <PageCard>
            <div className="space-y-2">
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

      <RecommendStickyFooter
        hint={results.length === 0 ? "번호 생성 후 「나의 로또번호에 저장」이 나타납니다" : undefined}
      >
        {results.length > 0 ? (
          <RecommendFooterSaveActions
            saved={saved}
            isDuplicate={isDuplicate}
            saveError={saveError}
            onSave={() => void handleSave()}
          />
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || allRounds.length === 0}
            className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-50"
          >
            {generating ? (
              <>
                <RotateCcw className="w-5 h-5 animate-spin" />
                패턴 분석 중...
              </>
            ) : allRounds.length === 0 ? (
              <>
                <X className="w-5 h-5" />
                로또 데이터를 불러오는 중입니다
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                패턴 {gameCount}게임 생성하기
              </>
            )}
          </button>
        )}
      </RecommendStickyFooter>
    </div>
  );
}
