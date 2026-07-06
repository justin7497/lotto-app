import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, CheckCircle2, Sparkles, RotateCcw, BookOpen } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import MobileSlipQr from "@/components/MobileSlipQr";
import SajuGuideSheet from "@/components/SajuGuideSheet";
import StoreQrButton from "@/components/StoreQrButton";
import type { GeneratedNumbers } from "@/data/types";
import {
  BLOOD_OPTIONS,
  buildSajuProfile,
  generateSajuLuckyGames,
  getSajuWeekKey,
  HOUR_PILLARS,
  loadSajuInput,
  loadWeeklySajuGames,
  saveSajuInput,
  saveWeeklySajuGames,
  SAJU_WEEKLY_GAME_COUNT,
  type BloodType,
  type SajuInput,
} from "@/utils/sajuLucky";
import { isDuplicateNumberSets, saveNumberSets } from "@/utils/savedNumbers";
import { useSavedSets } from "@/hooks/useSavedSets";

const GAME_COUNT = SAJU_WEEKLY_GAME_COUNT;

function defaultInput(): SajuInput {
  const saved = loadSajuInput();
  if (saved) return saved;
  return {
    year: 1970,
    month: 1,
    day: 1,
    hour: 11,
    bloodType: "A",
  };
}

export default function Saju() {
  const initial = defaultInput();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [bloodType, setBloodType] = useState<BloodType>(initial.bloodType);
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [showSlipQr, setShowSlipQr] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inputSavedHint, setInputSavedHint] = useState(false);
  const { sets: existingSets, setSets: setExistingSets } = useSavedSets();

  const weekKey = useMemo(() => getSajuWeekKey(), []);

  const input: SajuInput = useMemo(
    () => ({ year, month, day, hour, bloodType }),
    [year, month, day, hour, bloodType],
  );

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // 입력값 변경 시 자동 저장 (이 기기)
  useEffect(() => {
    const safeDay = Math.min(day, daysInMonth);
    const payload: SajuInput = { ...input, day: safeDay };
    saveSajuInput(payload);
    setInputSavedHint(true);
    const t = setTimeout(() => setInputSavedHint(false), 1200);
    return () => clearTimeout(t);
  }, [input, daysInMonth, day]);

  // 이번 주 이미 받은 10게임 복원
  useEffect(() => {
    const weekly = loadWeeklySajuGames();
    if (!weekly || weekly.games.length === 0) return;
    setResults(weekly.games);
    setProfileReady(true);
    void isDuplicateNumberSets(weekly.games, existingSets).then(setIsDuplicate);
  }, [existingSets]);

  const profile = useMemo(() => {
    if (!profileReady && results.length === 0) return null;
    try {
      return buildSajuProfile(input);
    } catch {
      return null;
    }
  }, [input, profileReady, results.length]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 1930 + 1 }, (_, i) => now - i);
  }, []);

  const hasThisWeek = results.length === GAME_COUNT;

  function handleGenerate() {
    const safeDay = Math.min(day, daysInMonth);
    if (day > daysInMonth) setDay(safeDay);
    const safeInput: SajuInput = { ...input, day: safeDay };
    saveSajuInput(safeInput);
    setGenerating(true);
    setSaved(false);
    setSaveError(null);
    setIsDuplicate(false);
    setResults([]);

    setTimeout(async () => {
      try {
        const p = buildSajuProfile(safeInput);
        const games = generateSajuLuckyGames(p, GAME_COUNT);
        setProfileReady(true);
        setResults(games);
        saveWeeklySajuGames(games, safeInput);
        setIsDuplicate(await isDuplicateNumberSets(games, existingSets));
        // 10게임 생성 시마다 모바일 슬립지 자동 표시
        if (games.length === GAME_COUNT) setShowSlipQr(true);
      } catch (err) {
        setProfileReady(false);
        setSaveError(
          err instanceof Error
            ? `사주 계산 실패: ${err.message}`
            : "사주 계산에 실패했습니다. 생년월일을 확인해 주세요.",
        );
      } finally {
        setGenerating(false);
      }
    }, 60);
  }

  async function handleSave() {
    if (results.length === 0 || saved || isDuplicate) return;
    setSaveError(null);
    if (results.length !== GAME_COUNT) {
      setSaveError(`게임 수가 ${results.length}개입니다. 다시 받아 주세요. (목표 ${GAME_COUNT}게임)`);
      return;
    }
    const result = await saveNumberSets(results, `사주 주간 ${GAME_COUNT}게임`);
    if (result.ok) {
      setSaved(true);
      setExistingSets((prev) => [result.set, ...prev]);
      setShowSlipQr(true);
      return;
    }
    setSaveError(result.error);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
      <div className="mb-5">
        <p className="text-sm font-semibold text-violet-700 mb-1">{weekKey} · 주간 사주</p>
        <h2 className="text-2xl font-extrabold text-gray-950 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-600" />
          사주 행운번호
        </h2>
        <p className="text-base text-gray-600 mt-1.5 leading-relaxed">
          만세력 사주 + 행운 풀 → 매주 {GAME_COUNT}게임 (1만 원 권)
        </p>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-base font-semibold text-violet-800 hover:bg-violet-100 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          사주 설명 보기
        </button>
      </div>

      <SajuGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />

      <div className="bg-white rounded-2xl border border-violet-100 p-3.5 sm:p-4 shadow-sm mb-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-gray-900">내 정보 입력</h3>
          <span
            className={`text-sm font-semibold transition-opacity ${
              inputSavedHint ? "text-emerald-600 opacity-100" : "text-gray-400 opacity-70"
            }`}
          >
            {inputSavedHint ? "저장됨" : "자동 저장"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <label className="block min-w-0">
            <span className="text-sm font-semibold text-gray-700 mb-1 block">출생년도</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-3 text-base font-semibold text-gray-900 min-h-[48px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-semibold text-gray-700 mb-1 block">월</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-3 text-base font-semibold text-gray-900 min-h-[48px]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-semibold text-gray-700 mb-1 block">일</span>
            <select
              value={Math.min(day, daysInMonth)}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-3 text-base font-semibold text-gray-900 min-h-[48px]"
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-semibold text-gray-700 mb-1 block">시간</span>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-1.5 py-3 text-base font-semibold text-gray-900 min-h-[48px]"
              title={HOUR_PILLARS.find((p) => p.startHour === hour)?.label}
            >
              {HOUR_PILLARS.map((p) => (
                <option key={p.label} value={p.startHour}>
                  {p.label.split(" ")[0]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-1.5 block">혈액형</legend>
          <div className="grid grid-cols-5 gap-2">
            {BLOOD_OPTIONS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBloodType(b.value)}
                className={`min-h-[48px] rounded-xl text-base font-bold border transition-colors ${
                  bloodType === b.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-violet-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>

        <motion.button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {generating ? (
            <>
              <RotateCcw className="w-5 h-5 animate-spin" />
              계산 중...
            </>
          ) : hasThisWeek ? (
            <>
              <Sparkles className="w-5 h-5" />
              이번 주 {GAME_COUNT}게임 다시 받기
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              이번 주 사주 {GAME_COUNT}게임 받기
            </>
          )}
        </motion.button>
        {hasThisWeek && (
          <p className="text-sm text-center text-gray-600">
            이번 주({weekKey}) 번호가 저장되어 있습니다. 다시 받으면 새 번호로 바뀝니다.
          </p>
        )}
      </div>

      {saveError && results.length === 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {saveError}
        </div>
      )}

      <AnimatePresence>
        {profile && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-violet-900 mb-1">
                {weekKey} · 만세력 사주팔자 · {results.length}게임
              </p>
              <p className="text-xs text-violet-700 mb-3">{profile.engineNote}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {(
                  [
                    ["연주", profile.pillars.year, profile.pillars.yearHanja],
                    ["월주", profile.pillars.month, profile.pillars.monthHanja],
                    ["일주", profile.pillars.day, profile.pillars.dayHanja],
                    ["시주", profile.pillars.hour, profile.pillars.hourHanja],
                  ] as const
                ).map(([label, ko, hanja]) => (
                  <div key={label} className="bg-white rounded-xl p-3 border border-violet-100 text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
                    <p className="text-lg font-extrabold text-gray-900">{ko}</p>
                    <p className="text-sm text-gray-500">{hanja}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3 border border-violet-50">
                  <p className="text-gray-600 font-medium">일간(日干)</p>
                  <p className="text-lg font-extrabold text-gray-900">{profile.dayMaster}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-violet-50 col-span-2 sm:col-span-1">
                  <p className="text-gray-600 font-medium">오행 분포</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug">{profile.elementSummary}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-violet-50">
                  <p className="text-gray-600 font-medium">띠 (연지)</p>
                  <p className="text-lg font-extrabold text-gray-900">
                    {profile.zodiacEasternEmoji} {profile.zodiacEastern}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-violet-50">
                  <p className="text-gray-600 font-medium">별자리</p>
                  <p className="text-lg font-extrabold text-gray-900">
                    {profile.zodiacWesternEmoji} {profile.zodiacWestern}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-violet-50">
                  <p className="text-gray-600 font-medium">혈액형</p>
                  <p className="text-lg font-extrabold text-gray-900">{profile.bloodLabel}</p>
                </div>
                {profile.voidBranches.length > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-violet-50">
                    <p className="text-gray-600 font-medium">공망</p>
                    <p className="text-lg font-extrabold text-gray-900">
                      {profile.voidBranches.join(", ")}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                입력 시진: <strong>{profile.hourPillarLabel}</strong>
                <br />
                행운 후보 번호:{" "}
                <span className="font-bold text-violet-800">{profile.luckyPool.join(", ")}</span>
              </p>
            </div>

            {saveError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="space-y-3 mb-4">
              <StoreQrButton onClick={() => setShowSlipQr(true)} />
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saved || isDuplicate}
                className={`w-full py-3 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 ${
                  saved
                    ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                    : isDuplicate
                      ? "border-gray-200 text-gray-400 bg-gray-50"
                      : "border-violet-300 text-violet-800 bg-violet-50 hover:bg-violet-100"
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    추출번호 저장 완료
                  </>
                ) : isDuplicate ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    이미 저장됨
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    추출번호에 저장
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {results.map((r, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-violet-800">#{idx + 1}</span>
                    <span className="text-sm text-gray-600">{r.summary}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {r.numbers.map((n, i) => (
                      <LottoBall
                        key={`${idx}-${i}-${n}`}
                        number={n}
                        size="sm"
                        highlight={profile.luckyPool.includes(n)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <MobileSlipQr
              open={showSlipQr}
              onClose={() => setShowSlipQr(false)}
              numberSets={results.map((r) => r.numbers)}
              title={`사주 주간 ${GAME_COUNT}게임`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
