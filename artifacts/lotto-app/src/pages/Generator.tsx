import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, Download, RotateCcw,
  Plus, Minus, Bookmark, CheckCircle2, ChevronDown, ChevronUp, X,
  Layers, Zap, BookOpen,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import LottoPickButton from "@/components/LottoPickButton";
import { getBallSolidColor } from "@/utils/lottoBallColors";
import MobileSlipQr from "@/components/MobileSlipQr";
import GeneratorGuideSheet from "@/components/GeneratorGuideSheet";
import ModeGuidePanel from "@/components/ModeGuidePanel";
import StoreQrButton from "@/components/StoreQrButton";
import { BULK_MODES, MODE_INFO, SINGLE_MODES, type SingleGeneratorMode } from "@/data/generatorModes";
import { useLottoContext } from "@/context/LottoDataContext";
import { generateMultiple, calcAC } from "@/utils/generator";
import { saveNumberSets, isDuplicateNumberSets, loadSavedSets, getRoundTag } from "@/utils/savedNumbers";
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

export default function Generator() {
  const { allRounds } = useLottoContext();

  const [viewMode, setViewMode] = useState<"single" | "bulk">("single");

  const [mode, setMode] = useState<SingleGeneratorMode>("balanced");
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [existingSets, setExistingSets] = useState<SavedSet[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [showExclude, setShowExclude] = useState(false);
  const [acFilter, setAcFilter] = useState(false);
  const [sectorFilter, setSectorFilter] = useState(false);
  const [tailSumFilter, setTailSumFilter] = useState(false);
  const [sameTailFilter, setSameTailFilter] = useState(false);
  const [consecutiveFilter, setConsecutiveFilter] = useState(false);

  const [bulkCounts, setBulkCounts] = useState<Record<SingleGeneratorMode, number>>({
    balanced: 20,
    weighted: 15,
    monte: 15,
    random: 5,
    delta: 15,
    sector: 10,
    tail: 10,
    consecutive: 15,
  });
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<SingleGeneratorMode>("balanced");
  const [bulkSavingAll, setBulkSavingAll] = useState(false);
  const [bulkSaveAllDone, setBulkSaveAllDone] = useState(false);
  const [slipQr, setSlipQr] = useState<{ numberSets: number[][]; title: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [bulkFocusMode, setBulkFocusMode] = useState<SingleGeneratorMode>("balanced");

  useEffect(() => {
    loadSavedSets().then(setExistingSets);
  }, []);

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
    setTimeout(async () => {
      const generated = generateMultiple(count, mode, allRounds, buildOpts());
      setResults(generated);
      const dup = await isDuplicateNumberSets(generated, existingSets);
      setIsDuplicate(dup);
      setGenerating(false);
      if (generated.length > 0) {
        setSlipQr({ numberSets: generated.map((r) => r.numbers), title: "추천 번호" });
      }
    }, 400);
  }

  async function handleSave() {
    if (results.length === 0 || saved || isDuplicate) return;
    const result = await saveNumberSets(results, computeSubLabel());
    if (!result.ok) return;
    setSaved(true);
    setExistingSets((prev) => [result.set, ...prev]);
  }

  function handleBulkGenerate() {
    setBulkGenerating(true);
    setBulkResults([]);
    setBulkSaveAllDone(false);
    setTimeout(async () => {
      const opts = buildOpts();
      const generated: BulkResult[] = await Promise.all(
        BULK_MODES.map(async (m) => {
          const sets = generateMultiple(bulkCounts[m], m, allRounds, opts);
          const dup = await isDuplicateNumberSets(sets, existingSets);
          return { mode: m, sets, saved: false, isDuplicate: dup };
        })
      );
      setBulkResults(generated);
      setActiveTab(BULK_MODES[0]);
      setBulkGenerating(false);
    }, 600);
  }

  async function handleBulkSaveAll() {
    if (bulkResults.length === 0 || bulkSavingAll || bulkSaveAllDone) return;
    setBulkSavingAll(true);
    const subLabel = computeSubLabel();
    const newSets: SavedSet[] = [];
    for (const r of bulkResults) {
      if (r.saved || r.isDuplicate) continue;
      const s = await saveNumberSets(r.sets, subLabel);
      if (s.ok) newSets.push(s.set);
    }
    setBulkResults((prev) => prev.map((r) => ({ ...r, saved: !r.isDuplicate })));
    setExistingSets((prev) => [...newSets, ...prev]);
    setBulkSavingAll(false);
    setBulkSaveAllDone(true);
  }

  async function handleBulkSaveSingle(m: SingleGeneratorMode) {
    const r = bulkResults.find((b) => b.mode === m);
    if (!r || r.saved || r.isDuplicate) return;
    const subLabel = computeSubLabel();
    const result = await saveNumberSets(r.sets, subLabel);
    if (!result.ok) return;
    setBulkResults((prev) => prev.map((b) => b.mode === m ? { ...b, saved: true } : b));
    setExistingSets((prev) => [result.set, ...prev]);
  }

  async function handleShare() {
    const text = results.map((r, i) => `[${i + 1}] ${r.numbers.join(", ")}${r.acValue !== undefined ? ` (AC:${r.acValue})` : ""}`).join("\n");
    const shareText = `🍀 로또 번호 추천 (${MODE_INFO[mode].label})\n${text}\n\n※ 통계 분석 기반이며 당첨을 보장하지 않습니다.`;
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
  const bulkAllSaved = bulkResults.length > 0 && bulkResults.every((r) => r.saved || r.isDuplicate);

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

  const FiltersPanel = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      <button
        onClick={() => setShowExclude((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-800 text-sm">고급 옵션</span>
          {excluded.size > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              제외수 {excluded.size}개
            </span>
          )}
          {activeFilterCount > 0 && (
            <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded-full">
              필터 {activeFilterCount}개
            </span>
          )}
        </div>
        {showExclude ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {showExclude && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-50">
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">제외수 설정</p>
                    <p className="text-xs text-gray-400">통계 기반 자동 선택 또는 직접 클릭</p>
                  </div>
                  {excluded.size > 0 && (
                    <button onClick={() => { setExcluded(new Set()); setActivePreset(null); }} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3" />전체 해제
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {AUTO_PRESETS.map((preset) => {
                    const isActive = activePreset === preset.key;
                    const c = preset.getExcluded(allRounds).length;
                    return (
                      <button key={preset.key} onClick={() => applyPreset(preset)}
                        className={`border rounded-xl px-3 py-2 text-left transition-all text-xs ${isActive ? "ring-2 ring-offset-1 ring-amber-400 " + preset.color : preset.color}`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          {preset.label}<span className="text-[10px] opacity-70">{c}개</span>
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
                    {Array.from(excluded).sort((a, b) => a - b).map((n) => (
                      <button key={n} onClick={() => toggleExclude(n)}
                        className="flex items-center gap-1 text-white text-sm font-extrabold px-2.5 py-1 rounded-full hover:brightness-110 shadow-sm ring-2 ring-white/50"
                        style={{ backgroundColor: getBallSolidColor(n) }}
                      >{n} <X className="w-3 h-3" /></button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  사용 가능한 번호: <span className="font-semibold text-gray-600">{availableCount}개</span>
                  {excluded.size > 0 && ` (${excluded.size}개 제외)`}
                </p>
              </div>

              {/* AC Filter */}
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">AC값 필터 (7~9)</p>
                    <p className="text-xs text-gray-400">번호 간 차이의 다양성이 높은 조합만 추출</p>
                  </div>
                  <button onClick={() => setAcFilter((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${acFilter ? "bg-violet-500" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${acFilter ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                {acFilter && (
                  <p className="text-xs text-violet-600 mt-1.5 bg-violet-50 rounded-lg px-3 py-1.5">
                    역대 당첨번호 중 66.7%가 AC 7~9 구간에 해당합니다
                  </p>
                )}
              </div>

              {/* Sector Filter */}
              <FilterToggle
                label="구간 분산 필터"
                desc="1~9 · 10~19 · 20~29 · 30~39 · 40~45 각 구간 1개 이상"
                hint="5개 구간 모두에서 최소 1개 번호 포함 조합만 추출합니다"
                value={sectorFilter}
                onChange={setSectorFilter}
                activeColor="bg-sky-500"
              />

              {/* Tail Sum Filter */}
              <FilterToggle
                label="끝수합 필터 (20~35)"
                desc="6개 번호 끝자리(일의 자리)의 합이 20~35 범위"
                hint="끝수 합이 고른 분포를 보이는 조합만 추출합니다"
                value={tailSumFilter}
                onChange={setTailSumFilter}
                activeColor="bg-pink-500"
              />

              {/* Same Tail Filter */}
              <FilterToggle
                label="동끝수 필터"
                desc="끝자리가 같은 번호 쌍이 최소 1개 포함"
                hint="예: 3과 13처럼 끝자리가 동일한 쌍이 포함된 조합"
                value={sameTailFilter}
                onChange={setSameTailFilter}
                activeColor="bg-fuchsia-500"
              />

              {/* Consecutive Filter */}
              <FilterToggle
                label="연번 필터"
                desc="연속된 번호 쌍(예: 7·8)이 최소 1개 포함"
                hint="역대 당첨번호 약 72%에 연속 번호 쌍이 포함됩니다"
                value={consecutiveFilter}
                onChange={setConsecutiveFilter}
                activeColor="bg-lime-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
      <div className="mb-5">
        <p className="text-sm font-semibold text-amber-600 mb-1">{getRoundTag()}</p>
        <h2 className="text-2xl font-extrabold text-gray-950 flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          번호 추천
        </h2>
        <p className="text-base text-gray-600 mt-1.5 leading-relaxed">
          8가지 통계 방식 · 개별 또는 일괄 생성
        </p>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-base font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          추천 설명 보기
        </button>
      </div>

      <GeneratorGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />

      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setViewMode("single")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-base font-semibold transition-all ${
            viewMode === "single" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Zap className="w-5 h-5" />개별 생성
        </button>
        <button
          onClick={() => setViewMode("bulk")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-base font-semibold transition-all ${
            viewMode === "bulk" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="w-5 h-5" />일괄 생성
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "single" ? (
          <motion.div key="single" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 mb-3">
              {SINGLE_MODES.map((m) => {
                const info = MODE_INFO[m];
                const Icon = info.icon;
                const isActive = mode === m;
                return (
                  <button key={m} onClick={() => setMode(m)}
                    className={`border-2 rounded-xl p-2.5 sm:p-3 transition-all text-center min-h-[72px] flex flex-col items-center justify-center gap-1 ${isActive ? info.active : info.inactive}`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="font-semibold text-sm leading-tight">{info.label}</div>
                  </button>
                );
              })}
            </div>

            <ModeGuidePanel mode={mode} className="mb-5" />

            {FiltersPanel}

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">생성 수</p>
                  <p className="text-xs text-gray-400">1~10세트 선택 가능</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setCount(Math.max(1, count - 1))} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-amber-500 w-8 text-center">{count}</span>
                  <button onClick={() => setCount(Math.min(10, count + 1))} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <motion.button
              onClick={handleGenerate}
              disabled={generating || availableCount < 6}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg mb-6 bg-gradient-to-br ${modeInfo.color} flex items-center justify-center gap-3 disabled:opacity-50`}
            >
              {generating ? (
                <><RotateCcw className="w-5 h-5 animate-spin" />{mode === "monte" ? "시뮬레이션 실행 중... (1~2초)" : "번호 생성 중..."}</>
              ) : availableCount < 6 ? (
                <><X className="w-5 h-5" />제외수가 너무 많습니다</>
              ) : (
                <><ModeIcon className="w-5 h-5" />번호 생성하기</>
              )}
            </motion.button>

            <AnimatePresence>
              {results.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div ref={resultRef} className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${modeInfo.color} flex items-center justify-center`}>
                        <ModeIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{modeInfo.label} 추천 번호</p>
                        <p className="text-xs text-gray-400">
                          {mode === "monte" ? "150,000회 시뮬레이션 · 상위 조합 추출" : `${allRounds.length}회차 데이터 기반`}
                          {excluded.size > 0 && ` · 제외수 ${excluded.size}개`}
                          {activeFilterCount > 0 && ` · 필터 ${activeFilterCount}개`}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {results.map((r, setIdx) => (
                        <motion.div key={setIdx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: setIdx * 0.08 }}
                          className="flex items-center gap-3"
                        >
                          <span className="text-sm font-bold text-gray-400 w-6 text-right">{setIdx + 1}</span>
                          <div className="flex gap-2 flex-wrap">
                            {r.numbers.map((n, i) => <LottoBall key={i} number={n} size="md" animate delay={setIdx * 0.1 + i * 0.06} />)}
                          </div>
                          <div className="ml-auto text-right">
                            <span className="text-xs text-gray-400 block">합: {r.numbers.reduce((a, b) => a + b, 0)}</span>
                            {r.acValue !== undefined && (
                              <span className={`text-xs font-medium ${r.acValue >= 7 && r.acValue <= 9 ? "text-violet-500" : "text-gray-400"}`}>AC:{r.acValue}</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-300 text-center mt-4">※ 통계 기반 분석이며 당첨을 보장하지 않습니다.</p>
                  </div>

                  <div className="space-y-3 mb-3">
                    <StoreQrButton
                      onClick={() =>
                        setSlipQr({
                          numberSets: results.map((r) => r.numbers),
                          title: "추천 번호",
                        })
                      }
                    />
                    <button onClick={handleSave} disabled={saved || isDuplicate}
                      className={`w-full py-3.5 rounded-xl border font-semibold text-base flex items-center justify-center gap-2 transition-colors ${
                        saved ? "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default"
                          : isDuplicate ? "border-gray-200 text-gray-400 bg-gray-50 cursor-default"
                          : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                      }`}
                    >
                      {saved ? <><CheckCircle2 className="w-5 h-5" />저장 완료!</>
                        : isDuplicate ? <><CheckCircle2 className="w-5 h-5" />이미 저장된 번호입니다</>
                        : <><Bookmark className="w-5 h-5" />추출번호에 저장</>
                      }
                    </button>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={handleShare} className="flex-1 min-w-[120px] py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-base flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                      <Share2 className="w-5 h-5" />공유하기
                    </button>
                    <button onClick={handleSaveImage} className="flex-1 min-w-[120px] py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-base flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                      <Download className="w-5 h-5" />이미지 저장
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="space-y-2 mb-3">
              {BULK_MODES.map((m) => {
                const info = MODE_INFO[m];
                const Icon = info.icon;
                const isFocused = bulkFocusMode === m;
                return (
                  <div
                    key={m}
                    className={`bg-white rounded-2xl border shadow-sm px-4 py-3 flex items-center gap-3 transition-colors ${
                      isFocused ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setBulkFocusMode(m)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-base">{info.label}</p>
                        <p className="text-sm text-gray-500 truncate">{info.desc}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setBulkCounts((prev) => ({ ...prev, [m]: Math.max(1, prev[m] - 1) }))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      ><Minus className="w-3.5 h-3.5" /></button>
                      <span className="text-lg font-bold text-amber-500 w-7 text-center">{bulkCounts[m]}</span>
                      <button onClick={() => setBulkCounts((prev) => ({ ...prev, [m]: Math.min(30, prev[m] + 1) }))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      ><Plus className="w-3.5 h-3.5" /></button>
                      <span className="text-xs text-gray-400 w-14 text-right">{(bulkCounts[m] * 1000).toLocaleString()}원</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <ModeGuidePanel mode={bulkFocusMode} className="mb-4" />

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-800">
                총 {totalBulkGames}게임 · {Math.ceil(totalBulkGames / 5)}장
              </span>
              <span className="text-sm font-bold text-amber-700">
                {(totalBulkGames * 1000).toLocaleString()}원
              </span>
            </div>

            {FiltersPanel}

            <motion.button
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || availableCount < 6}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg mb-6 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {bulkGenerating ? (
                <><RotateCcw className="w-5 h-5 animate-spin" />7개 모드 동시 생성 중...</>
              ) : availableCount < 6 ? (
                <><X className="w-5 h-5" />제외수가 너무 많습니다</>
              ) : (
                <><Layers className="w-5 h-5" />{totalBulkGames}게임 일괄 생성하기</>
              )}
            </motion.button>

            <AnimatePresence>
              {bulkResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <StoreQrButton
                    className="mb-3"
                    onClick={() => {
                      const allSets = bulkResults.flatMap((r) => r.sets);
                      setSlipQr({
                        numberSets: allSets.map((s) => s.numbers),
                        title: `일괄 생성 ${totalBulkGames}게임`,
                      });
                    }}
                  />
                  <button
                    onClick={handleBulkSaveAll}
                    disabled={bulkSavingAll || bulkAllSaved || bulkSaveAllDone}
                    className={`w-full py-3 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 mb-2 transition-colors ${
                      bulkSaveAllDone || bulkAllSaved
                        ? "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default"
                        : bulkSavingAll
                        ? "border-amber-200 text-amber-600 bg-amber-50 cursor-default"
                        : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                    }`}
                  >
                    {bulkSaveAllDone || bulkAllSaved ? (
                      <><CheckCircle2 className="w-4 h-4" />전체 저장 완료!</>
                    ) : bulkSavingAll ? (
                      <><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />저장 중...</>
                    ) : (
                      <><Bookmark className="w-4 h-4" />{totalBulkGames}게임 추출번호에 저장</>
                    )}
                  </button>
                  <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                  {bulkResults.map((r) => {
                      const info = MODE_INFO[r.mode];
                      const Icon = info.icon;
                      const isActive = activeTab === r.mode;
                      return (
                        <button key={r.mode} onClick={() => setActiveTab(r.mode)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border-2 transition-all ${
                            isActive ? info.tabColor + " border-current" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {info.label}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${r.saved ? "bg-emerald-100 text-emerald-600" : info.badgeColor}`}>
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
                        <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm mb-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${info.color} flex items-center justify-center`}>
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <p className="font-bold text-gray-900 text-sm">{info.label}</p>
                            {r.isDuplicate && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">이미 저장됨</span>}
                          </div>
                          <div className="space-y-1">
                            {r.sets.map((s, idx) => {
                              const slipNum = Math.floor(idx / 5) + 1;
                              const gameLabel = ["A","B","C","D","E"][idx % 5];
                              const isSlipStart = idx % 5 === 0 && r.sets.length > 5;
                              return (
                                <div key={idx}>
                                  {isSlipStart && (
                                    <div className="text-[10px] font-bold text-gray-400 mt-2 mb-1 px-1 flex items-center gap-1">
                                      <span className="inline-block w-3 h-px bg-gray-300"></span>
                                      슬립 {slipNum}장
                                      <span className="inline-block flex-1 h-px bg-gray-300"></span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-extrabold w-5 text-center rounded ${
                                      gameLabel === "A" ? "text-red-500" :
                                      gameLabel === "B" ? "text-orange-500" :
                                      gameLabel === "C" ? "text-green-500" :
                                      gameLabel === "D" ? "text-blue-500" :
                                      "text-purple-500"
                                    }`}>{gameLabel}</span>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {s.numbers.map((n, i) => <LottoBall key={i} number={n} size="sm" />)}
                                    </div>
                                    <span className="text-xs text-gray-300 ml-auto">합: {s.numbers.reduce((a, b) => a + b, 0)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <StoreQrButton
                          className="mb-2"
                          onClick={() => {
                            setSlipQr({
                              numberSets: r.sets.map((s) => s.numbers),
                              title: `${info.label} 번호`,
                            });
                          }}
                        />
                        <button
                          onClick={() => handleBulkSaveSingle(r.mode)}
                          disabled={r.saved || r.isDuplicate}
                          className={`w-full py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 mb-4 transition-colors ${
                            r.saved ? "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default"
                              : r.isDuplicate ? "border-gray-200 text-gray-400 bg-gray-50 cursor-default"
                              : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                          }`}
                        >
                          {r.saved ? <><CheckCircle2 className="w-4 h-4" />저장 완료!</>
                            : r.isDuplicate ? <><CheckCircle2 className="w-4 h-4" />이미 저장된 번호입니다</>
                            : <><Bookmark className="w-4 h-4" />{info.label} 추출번호에 저장</>
                          }
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileSlipQr
        numberSets={slipQr?.numberSets ?? []}
        open={slipQr !== null}
        onClose={() => setSlipQr(null)}
        title={slipQr?.title ?? "번호 QR"}
      />
    </div>
  );
}
