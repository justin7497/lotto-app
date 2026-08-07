import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, Download, RotateCcw,
  Plus, Minus, X,
  Layers, Zap,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import LottoPickButton from "@/components/LottoPickButton";
import { getBallSolidColor } from "@/utils/lottoBallColors";
import GeneratorGuideSheet from "@/components/GeneratorGuideSheet";
import PageCard from "@/components/PageCard";
import PageGuideBar from "@/components/PageGuideBar";
import { ConfirmActionButton } from "@/components/DeleteConfirmDialog";
import ModeGuidePanel from "@/components/ModeGuidePanel";
import {
  RecommendFooterSaveActions,
  RecommendResultSaveActions,
  RecommendStickyFooter,
} from "@/components/RecommendSaveActions";
import AutoSaveNotice from "@/components/AutoSaveNotice";
import SavedSourceList from "@/components/SavedSourceList";
import SendToSlipButton from "@/components/SendToSlipButton";
import {
  BULK_MODES,
  EXTRA_MODES,
  MODE_INFO,
  PRIMARY_MODES,
  SINGLE_MODES,
  type SingleGeneratorMode,
} from "@/data/generatorModes";import { useLottoContext } from "@/context/LottoDataContext";
import { generateMultiple, calcAC } from "@/utils/generator";
import { autoSaveGeneratedSets } from "@/utils/autoSaveNumbers";
import { isDuplicateNumberSets, loadSavedSets, getRoundTag, fillUniqueForWeek } from "@/utils/savedNumbers";
import type { SavedSet } from "@/utils/savedNumbers";
import { getFrequency, getRecentTrend, getNumbers } from "@/utils/analysis";
import type { GeneratedNumbers, GeneratorMode, LottoRound } from "@/data/types";

type PresetKey = "recent1" | "hot10" | "cold10" | "lowfreq";
const AUTO_PRESETS: {
  key: PresetKey;
  label: string;
  desc: string;
  color: string;
  getExcluded: (rounds: LottoRound[]) => number[];
}[] = [
  {
    key: "recent1",
    label: "직전 회차 출현",
    desc: "가장 최근 추첨된 6개 번호",
    color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
    getExcluded: (rounds) => {
      const latest = [...rounds].sort((a, b) => b.drwNo - a.drwNo)[0];
      return latest ? getNumbers(latest) : [];
    },
  },
  {
    key: "hot10",
    label: "최근 과출현",
    desc: "최근 10회 2번 이상 등장 번호",
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
    getExcluded: (rounds) => {
      const trend = getRecentTrend(rounds, 10);
      return trend.filter((t) => t.countInLast10 >= 2).map((t) => t.number);
    },
  },
  {
    key: "cold10",
    label: "장기 미출현",
    desc: "최근 10회 한 번도 안 나온 번호",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    getExcluded: (rounds) => {
      const sorted = [...rounds].sort((a, b) => b.drwNo - a.drwNo);
      const recentNums = new Set<number>();
      sorted.slice(0, 10).forEach((r) => getNumbers(r).forEach((n) => recentNums.add(n)));
      return Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !recentNums.has(n));
    },
  },
  {
    key: "lowfreq",
    label: "전체 저빈도",
    desc: "전체 기간 최저 빈도 하위 10개",
    color: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
    getExcluded: (rounds) => {
      const freq = getFrequency(rounds);
      return [...freq].sort((a, b) => a.count - b.count).slice(0, 10).map((f) => f.number);
    },
  },
];

interface BulkResult {
  mode: SingleGeneratorMode;
  sets: GeneratedNumbers[];
  saved: boolean;
  isDuplicate: boolean;
}

type GeneratorPageTab = "generate" | "advanced";
const PRICE_PER_GAME = 1000;
const MAX_SINGLE_COUNT = 5;

export default function Generator() {
  const { allRounds } = useLottoContext();

  const [pageTab, setPageTab] = useState<GeneratorPageTab>("generate");
  const [viewMode, setViewMode] = useState<"single" | "bulk">("single");
  const [showMoreModes, setShowMoreModes] = useState(false);

  const [mode, setMode] = useState<SingleGeneratorMode>("balanced");
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingSets, setExistingSets] = useState<SavedSet[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [acFilter, setAcFilter] = useState(false);
  const [sectorFilter, setSectorFilter] = useState(false);
  const [tailSumFilter, setTailSumFilter] = useState(false);
  const [sameTailFilter, setSameTailFilter] = useState(false);
  const [consecutiveFilter, setConsecutiveFilter] = useState(false);

  const [bulkCounts, setBulkCounts] = useState<Record<SingleGeneratorMode, number>>({
    balanced: 5,
    weighted: 5,
    monte: 5,
    random: 5,
    delta: 5,
    sector: 5,
    tail: 5,
    consecutive: 5,
  });
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<SingleGeneratorMode>("balanced");
  const [bulkFocusMode, setBulkFocusMode] = useState<SingleGeneratorMode>("balanced");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadSavedSets().then(setExistingSets);
  }, []);

  useEffect(() => {
    if (EXTRA_MODES.includes(mode)) setShowMoreModes(true);
  }, [mode]);

  function toggleExclude(n: number) {
    setActivePreset(null);
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else if (next.size < 39) next.add(n);
      return next;
    });
  }

  function applyPreset(preset: (typeof AUTO_PRESETS)[number]) {
    if (activePreset === preset.key) {
      setActivePreset(null);
      setExcluded(new Set());
    } else {
      const nums = preset.getExcluded(allRounds);
      setActivePreset(preset.key);
      setExcluded(new Set(nums));
    }
  }

  const activeFilterCount =
    (acFilter ? 1 : 0) + (sectorFilter ? 1 : 0) + (tailSumFilter ? 1 : 0) +
    (sameTailFilter ? 1 : 0) + (consecutiveFilter ? 1 : 0);

  function computeSubLabel(): string {
    const parts: string[] = [];
    if (activePreset) {
      const preset = AUTO_PRESETS.find((p) => p.key === activePreset);
      if (preset) parts.push(preset.label);
    } else if (excluded.size > 0) {
      parts.push("제외수 설정");
    }
    if (acFilter) parts.push("AC필터");
    if (sectorFilter) parts.push("구간분산");
    if (tailSumFilter) parts.push("끝수합");
    if (sameTailFilter) parts.push("동끝수");
    if (consecutiveFilter) parts.push("연번");
    return parts.length > 0 ? parts.join("+") : "기본 설정";
  }

  function buildOpts() {
    return {
      exclude: Array.from(excluded),
      acFilter,
      sectorFilter,
      tailSumFilter,
      sameTailFilter,
      consecutiveFilter,
    };
  }

  function handleGenerate() {
    setGenerating(true);
    setResults([]);
    setSaved(false);
    setIsDuplicate(false);
    setSaveError(null);
    setTimeout(async () => {
      const factory = () => generateMultiple(1, mode, allRounds, buildOpts())[0];
      const generated = fillUniqueForWeek(
        generateMultiple(count, mode, allRounds, buildOpts()),
        count,
        factory,
        existingSets,
      );
      setResults(generated);
      const dup = await isDuplicateNumberSets(generated, existingSets);
      setIsDuplicate(dup);
      setGenerating(false);
    }, 400);
  }

  function handleBulkGenerate() {
    setBulkGenerating(true);
    setBulkResults([]);
    setSaved(false);
    setIsDuplicate(false);
    setSaveError(null);
    setTimeout(async () => {
      const opts = buildOpts();
      const generated: BulkResult[] = await Promise.all(
        BULK_MODES.map(async (m) => {
          const factory = () => generateMultiple(1, m, allRounds, opts)[0];
          const sets = fillUniqueForWeek(
            generateMultiple(bulkCounts[m], m, allRounds, opts),
            bulkCounts[m],
            factory,
            existingSets,
          );
          const dup = await isDuplicateNumberSets(sets, existingSets);
          return { mode: m, sets, saved: false, isDuplicate: dup };
        }),
      );

      setBulkResults(generated);
      setActiveTab(BULK_MODES[0]);
      setBulkGenerating(false);
    }, 600);
  }

  async function handleSave() {
    setSaveError(null);
    setSaved(false);
    setIsDuplicate(false);

    if (viewMode === "single") {
      if (results.length === 0) return;
      const dup = await isDuplicateNumberSets(results, existingSets);
      if (dup) {
        setIsDuplicate(true);
        return;
      }
      const saveResult = await autoSaveGeneratedSets(results, computeSubLabel());
      if (saveResult.status === "saved") {
        setSaved(true);
        setExistingSets((prev) => [saveResult.set, ...prev]);
      } else if (saveResult.status === "duplicate") {
        setIsDuplicate(true);
      } else if (saveResult.status === "error") {
        setSaveError(saveResult.message);
      }
      return;
    }

    if (bulkResults.length === 0) return;
    const subLabel = computeSubLabel();
    let anySaved = false;
    let anyDuplicate = false;
    const nextResults: BulkResult[] = [];

    for (const row of bulkResults) {
      if (row.sets.length === 0) {
        nextResults.push(row);
        continue;
      }
      const dup = await isDuplicateNumberSets(row.sets, existingSets);
      if (dup) {
        anyDuplicate = true;
        nextResults.push({ ...row, isDuplicate: true });
        continue;
      }
      const saveResult = await autoSaveGeneratedSets(row.sets, subLabel);
      if (saveResult.status === "saved") {
        anySaved = true;
        setExistingSets((prev) => [saveResult.set, ...prev]);
        nextResults.push({ ...row, saved: true });
      } else if (saveResult.status === "duplicate") {
        anyDuplicate = true;
        nextResults.push({ ...row, isDuplicate: true });
      } else {
        nextResults.push(row);
        if (saveResult.status === "error") setSaveError(saveResult.message);
      }
    }

    setBulkResults(nextResults);
    setSaved(anySaved);
    if (anyDuplicate && !anySaved) setIsDuplicate(true);
  }

  async function handleShare() {
    const text = results.map((r, i) => `[${i + 1}] ${r.numbers.join(", ")}${r.acValue !== undefined ? ` (AC:${r.acValue})` : ""}`).join("\n");
    const shareText = `🍀 로또 번호 추천 (${MODE_INFO[mode].label})\n${text}`;
    if (navigator.share) {
      try { await navigator.share({ title: "로또 번호 추천", text: shareText }); }
      catch { await navigator.clipboard.writeText(shareText); alert("클립보드에 복사되었습니다!"); }
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
      a.href = url; a.download = `lotto_numbers_${Date.now()}.png`; a.click();
    } catch { alert("이미지 저장 중 오류가 발생했습니다."); }
  }

  const modeInfo = MODE_INFO[mode];
  const ModeIcon = modeInfo.icon;
  const availableCount = 45 - excluded.size;
  const totalBulkGames = BULK_MODES.reduce((sum, m) => sum + bulkCounts[m], 0);
  const activeGameCount = viewMode === "single" ? count : totalBulkGames;
  const activeGamePrice = activeGameCount * PRICE_PER_GAME;
  const advancedBadgeCount = (excluded.size > 0 ? 1 : 0) + activeFilterCount;
  const visibleModes = showMoreModes ? SINGLE_MODES : PRIMARY_MODES;

  const slipGames = useMemo(() => {
    if (viewMode === "single") return results;
    return bulkResults.flatMap((row) => row.sets).slice(0, 20);
  }, [viewMode, results, bulkResults]);

  const hasSlipGames = slipGames.length > 0;
  const hasGeneratedResults =
    viewMode === "single" ? results.length > 0 : bulkResults.length > 0;
  const bulkAllSaved = bulkResults.length > 0 && bulkResults.every((row) => row.saved || row.isDuplicate);
  const canSave =
    hasGeneratedResults &&
    !saved &&
    !(viewMode === "bulk" && bulkAllSaved) &&
    !(viewMode === "single" && isDuplicate);
  const showStickyFooter = pageTab === "generate";
  const canGenerate = availableCount >= 6;

  function FilterToggle({
    label, desc, hint, value, onChange, activeColor,
  }: {
    label: string; desc: string; hint?: string; value: boolean;
    onChange: (v: boolean) => void; activeColor: string;
  }) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
          <button
            onClick={() => onChange(!value)}
            className={`relative w-11 h-6 rounded-full transition-colors ${value ? activeColor : "bg-gray-200"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-6" : "left-1"}`} />
          </button>
        </div>
        {value && hint && (
          <p className={`text-xs mt-1.5 rounded-lg px-3 py-1.5 ${activeColor.replace("bg-", "text-").replace("-500", "-600")} bg-opacity-10`}
            style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
            {hint}
          </p>
        )}
      </div>
    );
  }

  const AdvancedSettingsPanel = (
    <PageCard className="!p-0 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="font-extrabold text-gray-900 text-base">제외수 · 필터 설정</p>
        <p className="text-sm text-gray-500 mt-1">번호 만들기에 적용됩니다</p>
      </div>
      <div className="px-4 pb-4">
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-800 text-sm">제외수 설정</p>
              <p className="text-xs text-gray-400">통계 기반 자동 선택 또는 직접 클릭</p>
            </div>
            {excluded.size > 0 && (
              <ConfirmActionButton
                label="전체 해제"
                size="compact"
                tone="danger"
                confirmTitle="제외수 전체 해제"
                confirmMessage="설정한 제외수를 모두 해제할까요?"
                confirmLabel="전체 해제"
                onConfirm={() => {
                  setExcluded(new Set());
                  setActivePreset(null);
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {AUTO_PRESETS.map((preset) => {
              const isActive = activePreset === preset.key;
              const c = preset.getExcluded(allRounds).length;
              return (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset)}
                  className={`border rounded-xl px-3 py-2 text-left transition-all text-xs ${isActive ? "ring-2 ring-offset-1 ring-gray-400 " + preset.color : preset.color}`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    {preset.label}
                    <span className="text-caption opacity-70">{c}개</span>
                  </div>
                  <div className="opacity-60 mt-0.5 leading-tight">{preset.desc}</div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-9 gap-2">
            {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
              <LottoPickButton
                key={n}
                number={n}
                excluded={excluded.has(n)}
                onClick={() => toggleExclude(n)}
              />
            ))}
          </div>
          {excluded.size > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(excluded)
                .sort((a, b) => a - b)
                .map((n) => (
                  <div
                    key={n}
                    className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-1 py-1 shadow-sm ring-2 ring-white/50"
                    style={{ backgroundColor: getBallSolidColor(n) }}
                  >
                    <span className="text-white text-sm font-extrabold tabular-nums">{n}</span>
                    <ConfirmActionButton
                      label="해제"
                      size="compact"
                      tone="light"
                      confirmTitle="제외수 해제"
                      confirmMessage={`${n}번을 제외수에서 해제할까요?`}
                      confirmLabel="해제"
                      onConfirm={() => toggleExclude(n)}
                    />
                  </div>
                ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            사용 가능한 번호: <span className="font-semibold text-gray-600">{availableCount}개</span>
            {excluded.size > 0 && ` (${excluded.size}개 제외)`}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">AC값 필터 (7~9)</p>
              <p className="text-xs text-gray-400">번호 간 차이의 다양성이 높은 조합만 추출</p>
            </div>
            <button
              onClick={() => setAcFilter((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${acFilter ? "bg-gray-500" : "bg-gray-200"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${acFilter ? "left-6" : "left-1"}`}
              />
            </button>
          </div>
          {acFilter && (
            <p className="text-xs text-gray-700 mt-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              역대 당첨번호 중 66.7%가 AC 7~9 구간에 해당합니다
            </p>
          )}
        </div>

        <FilterToggle
          label="구간 분산 필터"
          desc="1~9 · 10~19 · 20~29 · 30~39 · 40~45 각 구간 1개 이상"
          hint="5개 구간 모두에서 최소 1개 번호 포함 조합만 추출합니다"
          value={sectorFilter}
          onChange={setSectorFilter}
          activeColor="bg-sky-500"
        />

        <FilterToggle
          label="끝수합 필터 (20~35)"
          desc="6개 번호 끝자리(일의 자리)의 합이 20~35 범위"
          hint="끝수 합이 고른 분포를 보이는 조합만 추출합니다"
          value={tailSumFilter}
          onChange={setTailSumFilter}
          activeColor="bg-pink-500"
        />

        <FilterToggle
          label="동끝수 필터"
          desc="끝자리가 같은 번호 쌍이 최소 1개 포함"
          hint="예: 3과 13처럼 끝자리가 동일한 쌍이 포함된 조합"
          value={sameTailFilter}
          onChange={setSameTailFilter}
          activeColor="bg-fuchsia-500"
        />

        <FilterToggle
          label="연번 필터"
          desc="연속된 번호 쌍(예: 7·8)이 최소 1개 포함"
          hint="역대 당첨번호 약 72%에 연속 번호 쌍이 포함됩니다"
          value={consecutiveFilter}
          onChange={setConsecutiveFilter}
          activeColor="bg-lime-500"
        />
      </div>
    </PageCard>
  );

  function renderModeGrid(
    selectedMode: SingleGeneratorMode,
    onSelect: (mode: SingleGeneratorMode) => void,
  ) {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {visibleModes.map((m) => {
            const info = MODE_INFO[m];
            const Icon = info.icon;
            const isActive = selectedMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onSelect(m)}
                className={`border-2 rounded-xl p-2.5 sm:p-3 transition-all text-center min-h-[72px] flex flex-col items-center justify-center gap-1 ${isActive ? info.active : info.inactive}`}
              >
                <Icon className="w-5 h-5" />
                <div className="font-semibold text-base leading-tight">{info.label}</div>
              </button>
            );
          })}
        </div>
        {!showMoreModes ? (
          <button
            type="button"
            onClick={() => setShowMoreModes(true)}
            className="generator-page__more-btn"
          >
            더보기 (+{EXTRA_MODES.length}가지)
          </button>
        ) : null}
      </>
    );
  }

  function renderGameSummary() {
    return (
      <div className="generator-page__summary" aria-live="polite">
        <span>
          {activeGameCount}게임
          {viewMode === "bulk" ? ` · ${Math.ceil(activeGameCount / 5)}장` : ""}
        </span>
        <span>{activeGamePrice.toLocaleString("ko-KR")}원</span>
      </div>
    );
  }

  function renderFooterButton() {
    if (hasGeneratedResults) {
      return (
        <RecommendFooterSaveActions
          saved={saved}
          isDuplicate={isDuplicate}
          saveError={saveError}
          disabled={!canSave || generating || bulkGenerating}
          onSave={() => void handleSave()}
        />
      );
    }

    const isBusy = viewMode === "single" ? generating : bulkGenerating;
    const onClick = viewMode === "single" ? handleGenerate : handleBulkGenerate;

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isBusy || !canGenerate}
        className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-50"
      >
        {isBusy ? (
          <>
            <RotateCcw className="w-5 h-5 animate-spin" />
            {viewMode === "bulk"
              ? "7개 모드 동시 생성 중..."
              : mode === "monte"
                ? "시뮬레이션 실행 중..."
                : "번호 생성 중..."}
          </>
        ) : !canGenerate ? (
          <>
            <X className="w-5 h-5" />
            제외수가 너무 많습니다
          </>
        ) : viewMode === "bulk" ? (
          <>
            <Layers className="w-5 h-5" />
            {activeGameCount}게임 일괄 생성하기
          </>
        ) : (
          <>
            <ModeIcon className="w-5 h-5" />
            {activeGameCount}게임 생성하기
          </>
        )}
      </button>
    );
  }

  return (
    <div className={`page-content generator-page${showStickyFooter ? " page-content--generator" : ""}`}>
      <PageGuideBar
        tag={getRoundTag()}
        guideLabel="추천 설명"
        onGuide={() => setShowGuide(true)}
      />

      <GeneratorGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />

      <div className="win-page-tabs generator-page__tabs" role="tablist" aria-label="추천 메뉴">
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === "generate"}
          className={`win-page-tabs__btn${pageTab === "generate" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setPageTab("generate")}
        >
          번호 만들기
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === "advanced"}
          className={`win-page-tabs__btn${pageTab === "advanced" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setPageTab("advanced")}
        >
          고급 설정
          {advancedBadgeCount > 0 ? (
            <span className="generator-page__tab-badge">{advancedBadgeCount}</span>
          ) : null}
        </button>
      </div>

      {pageTab === "advanced" ? (
        AdvancedSettingsPanel
      ) : (
        <>
          <p className="generator-page__notice" role="status">
            방식을 고른 뒤 생성 수를 정하고 번호를 만드세요. 제외수·필터는{" "}
            <strong>고급 설정</strong> 탭에서 바꿀 수 있어요.
            {advancedBadgeCount > 0 ? (
              <button
                type="button"
                className="generator-page__notice-btn"
                onClick={() => setPageTab("advanced")}
              >
                고급 설정 보기
              </button>
            ) : null}
          </p>

          {renderGameSummary()}

          <div className="generator-page__view-toggle">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`generator-page__view-btn${viewMode === "single" ? " generator-page__view-btn--active" : ""}`}
            >
              <Zap className="w-5 h-5" />
              개별 생성
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bulk")}
              className={`generator-page__view-btn${viewMode === "bulk" ? " generator-page__view-btn--active" : ""}`}
            >
              <Layers className="w-5 h-5" />
              일괄 생성
            </button>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === "single" ? (
              <motion.div
                key="single"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderModeGrid(mode, setMode)}
                <ModeGuidePanel mode={mode} className="mb-4" />

                <PageCard className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">생성 수</p>
                      <p className="text-xs text-gray-400">1~{MAX_SINGLE_COUNT}세트 선택 가능</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCount(Math.max(1, count - 1))}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-2xl font-bold text-gray-800 w-8 text-center">{count}</span>
                      <button
                        type="button"
                        onClick={() => setCount(Math.min(MAX_SINGLE_COUNT, count + 1))}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </PageCard>

                <AnimatePresence>
                  {results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div ref={resultRef}>
                        <PageCard>
                          <div className="flex items-center gap-2 mb-4">
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${modeInfo.color} flex items-center justify-center`}
                            >
                              <ModeIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{modeInfo.label} 추천 번호</p>
                              <p className="text-xs text-gray-400">
                                {results.length}게임 · {(results.length * PRICE_PER_GAME).toLocaleString("ko-KR")}원
                                {mode === "monte"
                                  ? " · 150,000회 시뮬레이션"
                                  : ` · ${allRounds.length}회차 데이터`}
                                {excluded.size > 0 && ` · 제외수 ${excluded.size}개`}
                                {activeFilterCount > 0 && ` · 필터 ${activeFilterCount}개`}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            {results.map((r, setIdx) => (
                              <motion.div
                                key={setIdx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: setIdx * 0.08 }}
                                className="flex items-center gap-2 min-w-0"
                              >
                                <span className="text-base font-bold text-gray-500 w-6 shrink-0 text-right">
                                  {setIdx + 1}
                                </span>
                                <div className="ball-row ball-row--fluid flex-1 min-w-0">
                                  {r.numbers.map((n, i) => (
                                    <LottoBall
                                      key={i}
                                      number={n}
                                      size="sm"
                                      animate
                                      delay={setIdx * 0.1 + i * 0.06}
                                    />
                                  ))}
                                </div>
                                <div className="shrink-0 text-right pl-1">
                                  <span className="text-xs text-gray-400 block">
                                    합:{r.numbers.reduce((a, b) => a + b, 0)}
                                  </span>
                                  {r.acValue !== undefined && (
                                    <span
                                      className={`text-xs font-medium ${r.acValue >= 7 && r.acValue <= 9 ? "text-violet-500" : "text-gray-400"}`}
                                    >
                                      AC:{r.acValue}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <button
                              type="button"
                              onClick={handleShare}
                              className="page-cta page-cta--secondary flex-1 min-w-[120px]"
                            >
                              <Share2 className="w-5 h-5" />
                              공유하기
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveImage}
                              className="page-cta page-cta--secondary flex-1 min-w-[120px]"
                            >
                              <Download className="w-5 h-5" />
                              이미지 저장
                            </button>
                          </div>

                          <RecommendResultSaveActions
                            saved={saved}
                            isDuplicate={isDuplicate}
                            saveError={saveError}
                            onSave={() => void handleSave()}
                            className="!mb-0 !mt-4"
                            slipSlot={
                              hasSlipGames ? (
                                <SendToSlipButton
                                  games={slipGames}
                                  source="recommend"
                                  sourceLabel={modeInfo.label}
                                  className="!flex-row !gap-2 w-full"
                                />
                              ) : undefined
                            }
                          />
                        </PageCard>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="bulk"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="space-y-2 mb-3">
                  {BULK_MODES.map((m) => {
                    const info = MODE_INFO[m];
                    const Icon = info.icon;
                    const isFocused = bulkFocusMode === m;
                    return (
                      <PageCard
                        key={m}
                        className={`!py-3 flex items-center gap-3 transition-colors ${
                          isFocused ? "!border-gray-300 ring-1 ring-gray-200" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setBulkFocusMode(m)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-base">{info.label}</p>
                            <p className="text-sm text-gray-500 leading-relaxed">{info.desc}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setBulkCounts((prev) => ({ ...prev, [m]: Math.max(1, prev[m] - 1) }))
                            }
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-lg font-bold text-gray-800 w-7 text-center">
                            {bulkCounts[m]}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setBulkCounts((prev) => ({
                                ...prev,
                                [m]: Math.min(MAX_SINGLE_COUNT, prev[m] + 1),
                              }))
                            }
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs text-gray-400 w-14 text-right">
                            {(bulkCounts[m] * PRICE_PER_GAME).toLocaleString()}원
                          </span>
                        </div>
                      </PageCard>
                    );
                  })}
                </div>

                <ModeGuidePanel mode={bulkFocusMode} className="mb-4" />

                <AnimatePresence>
                  {bulkResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                        {bulkResults.map((r) => {
                          const info = MODE_INFO[r.mode];
                          const Icon = info.icon;
                          const isActive = activeTab === r.mode;
                          return (
                            <button
                              key={r.mode}
                              type="button"
                              onClick={() => setActiveTab(r.mode)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border-2 transition-all ${
                                isActive
                                  ? info.tabColor + " border-current"
                                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {info.label}
                              <span
                                className={`text-caption px-1.5 py-0.5 rounded-full font-bold ${r.saved ? "bg-emerald-100 text-emerald-600" : info.badgeColor}`}
                              >
                                {r.saved ? "저장됨" : `${r.sets.length}게임`}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {bulkResults.map((r) => {
                        if (r.mode !== activeTab) return null;
                        const info = MODE_INFO[r.mode];
                        const Icon = info.icon;
                        return (
                          <motion.div key={r.mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <PageCard className="!p-4 mb-3">
                              <div className="flex items-center gap-2 mb-3">
                                <div
                                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${info.color} flex items-center justify-center`}
                                >
                                  <Icon className="w-3.5 h-3.5 text-white" />
                                </div>
                                <p className="font-bold text-gray-900 text-base">{info.label}</p>
                                {r.isDuplicate && (
                                  <span className="text-caption text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    이번 주 저장됨
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {r.sets.map((s, idx) => {
                                  const slipNum = Math.floor(idx / 5) + 1;
                                  const gameLabel = ["A", "B", "C", "D", "E"][idx % 5];
                                  const isSlipStart = idx % 5 === 0 && r.sets.length > 5;
                                  return (
                                    <div key={idx}>
                                      {isSlipStart && (
                                        <div className="text-caption font-bold text-gray-400 mt-2 mb-1 px-1 flex items-center gap-1">
                                          <span className="inline-block w-3 h-px bg-gray-300" />
                                          슬립 {slipNum}장
                                          <span className="inline-block flex-1 h-px bg-gray-300" />
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className={`text-xs font-extrabold w-4 shrink-0 text-center rounded ${
                                            gameLabel === "A"
                                              ? "text-red-500"
                                              : gameLabel === "B"
                                                ? "text-orange-500"
                                                : gameLabel === "C"
                                                  ? "text-green-500"
                                                  : gameLabel === "D"
                                                    ? "text-blue-500"
                                                    : "text-purple-500"
                                          }`}
                                        >
                                          {gameLabel}
                                        </span>
                                        <div className="ball-row ball-row--fluid flex-1 min-w-0">
                                          {s.numbers.map((n, i) => (
                                            <LottoBall key={i} number={n} size="sm" />
                                          ))}
                                        </div>
                                        <span className="text-xs text-gray-300 shrink-0">
                                          합:{s.numbers.reduce((a, b) => a + b, 0)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </PageCard>
                            {r.saved ? (
                              <AutoSaveNotice saved className="mb-4" />
                            ) : r.isDuplicate ? (
                              <AutoSaveNotice isDuplicate className="mb-4" />
                            ) : null}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {viewMode === "bulk" && bulkResults.length > 0 ? (
            <RecommendResultSaveActions
              saved={saved}
              isDuplicate={isDuplicate && !saved}
              saveError={saveError}
              disabled={!canSave || generating || bulkGenerating}
              onSave={() => void handleSave()}
              slipSlot={
                hasSlipGames ? (
                  <SendToSlipButton
                    games={slipGames}
                    source="recommend"
                    sourceLabel="일괄 추천"
                    className="!flex-row !gap-2 w-full"
                  />
                ) : undefined
              }
            />
          ) : null}

          {hasSlipGames ? renderGameSummary() : null}

          <SavedSourceList source="recommend" title="저장된 추천 번호" />
        </>
      )}

      {showStickyFooter ? (
        <RecommendStickyFooter
          hint={!hasGeneratedResults ? "번호 생성 후 「나의 로또번호에 저장」이 나타납니다" : undefined}
        >
          {renderFooterButton()}
        </RecommendStickyFooter>
      ) : null}
    </div>
  );
}
