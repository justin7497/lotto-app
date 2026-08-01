import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, RefreshCw, Lock, ShieldCheck } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import PageCard from "@/components/PageCard";
import PageGuideBar from "@/components/PageGuideBar";
import SajuGuideSheet from "@/components/SajuGuideSheet";
import SavedSourceList from "@/components/SavedSourceList";
import SaveNumbersButton from "@/components/SaveNumbersButton";
import SendToSlipButton from "@/components/SendToSlipButton";
import { TrustFooter, TrustHeader, TrustPanel } from "@/components/TrustUI";
import type { GeneratedNumbers } from "@/data/types";
import { fetchSazuAnalyze, isSazuConfigured } from "@/lib/sazuApi";
import {
  BLOOD_OPTIONS,
  buildSajuProfile,
  generateSajuLuckyGames,
  getSajuWeekKey,
  loadSajuInput,
  loadWeeklySajuGames,
  saveSajuInput,
  saveWeeklySajuGames,
  SAJU_WEEKLY_GAME_COUNT,
  buildDailySajuContent,
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
    hour: 12,
    minute: 0,
    bloodType: "A",
  };
}

export default function Saju() {
  const initial = defaultInput();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [bloodType, setBloodType] = useState<BloodType>(initial.bloodType);
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inputSavedHint, setInputSavedHint] = useState(false);
  const [externalStatus, setExternalStatus] = useState<string | null>(null);
  const [externalLoading, setExternalLoading] = useState(false);
  const [dailyTick, setDailyTick] = useState(() => Date.now());
  const { sets: existingSets, setSets: setExistingSets } = useSavedSets();

  const weekKey = useMemo(() => getSajuWeekKey(), []);

  const input: SajuInput = useMemo(
    () => ({ year, month, day, hour, minute, bloodType }),
    [year, month, day, hour, minute, bloodType],
  );

  const birthTimeValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  function handleBirthTimeChange(value: string) {
    const [h, m] = value.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    setHour(Math.min(23, Math.max(0, h)));
    setMinute(Math.min(59, Math.max(0, m)));
  }

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

  // 이번 주 이미 받은 5게임 복원
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
  const previewProfile = useMemo(() => {
    try {
      return buildSajuProfile(input);
    } catch {
      return null;
    }
  }, [input]);
  const dailyContent = useMemo(
    () => (previewProfile ? buildDailySajuContent(previewProfile, new Date(dailyTick)) : null),
    [previewProfile, dailyTick],
  );
  const dailyDateText = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      }).format(new Date(dailyTick)),
    [dailyTick],
  );

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
    setExternalStatus(null);
    setResults([]);

    setTimeout(async () => {
      try {
        const p = buildSajuProfile(safeInput);
        const games = generateSajuLuckyGames(p, GAME_COUNT);
        setProfileReady(true);
        setResults(games);
        saveWeeklySajuGames(games, safeInput);
        setIsDuplicate(await isDuplicateNumberSets(games, existingSets));
        if (isSazuConfigured()) {
          setExternalLoading(true);
          const external = await fetchSazuAnalyze(safeInput);
          setExternalStatus(
            external.ok
              ? `외부 SAZU 연동 성공 · ${external.message ?? "응답 수신"}`
              : `SAZU 연동 실패 · ${external.message ?? "설정 확인"}`,
          );
          setExternalLoading(false);
        }
      } catch (err) {
        setProfileReady(false);
        setSaveError(
          err instanceof Error
            ? `사주 계산 실패 · ${err.message}`
            : "사주 계산 실패 · 생년월일 확인",
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
      setSaveError(`게임 수 ${results.length}개 · 목표 ${GAME_COUNT}게임`);
      return;
    }
    const result = await saveNumberSets(results, `사주 주간 ${GAME_COUNT}게임`);
    if (result.ok) {
      setSaved(true);
      setExistingSets((prev) => [result.set, ...prev]);
      return;
    }
    setSaveError(result.error);
  }

  return (
    <div className="page-content">
      <PageGuideBar
        tag={`${weekKey} · 주간 사주`}
        guideLabel="사주 설명"
        onGuide={() => setShowGuide(true)}
      />

      <SajuGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />

      <TrustPanel className="trust-panel--wide mb-4">
        <TrustHeader
          badges={[
            { icon: ShieldCheck, label: "기기 내 저장" },
            { icon: Lock, label: "외부 미전송" },
          ]}
          lead="생년월일 정보는 번호 추천에만 사용됩니다"
        />
      <PageCard className="space-y-3 !shadow-none !border-0 !p-0 !bg-transparent">
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
            <span className="text-base font-semibold text-gray-700 mb-1 block">출생년도</span>
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
            <span className="text-base font-semibold text-gray-700 mb-1 block">월</span>
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
            <span className="text-base font-semibold text-gray-700 mb-1 block">일</span>
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
            <span className="text-base font-semibold text-gray-700 mb-1 block">출생 시간</span>
            <input
              type="time"
              value={birthTimeValue}
              onChange={(e) => handleBirthTimeChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-3 text-base font-semibold text-gray-900 min-h-[48px]"
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-base font-semibold text-gray-700 mb-1.5 block">혈액형</legend>
          <div className="grid grid-cols-5 gap-2">
            {BLOOD_OPTIONS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBloodType(b.value)}
                className={`min-h-[48px] rounded-xl text-base font-bold border transition-colors ${
                  bloodType === b.value
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="page-cta page-cta--dark w-full disabled:opacity-50"
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
        </button>
        {hasThisWeek && (
          <p className="text-sm text-center text-gray-600">
            이번 주({weekKey}) 번호 저장됨 · 다시 받기 시 교체
          </p>
        )}
        {isSazuConfigured() && (
          <p className="text-xs text-center text-gray-500">
            SAZU 연동 ON
            {externalLoading ? " · 응답 확인 중" : ""}
          </p>
        )}
      </PageCard>
        <TrustFooter>입력 정보는 이 기기에만 저장되며, 외부로 전송되지 않습니다</TrustFooter>
      </TrustPanel>

      {dailyContent && (
        <PageCard>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-extrabold text-gray-800">{dailyContent.title}</h4>
              <p className="text-xs font-semibold text-gray-700">{dailyDateText} 기준</p>
            </div>
            <button
              type="button"
              onClick={() => setDailyTick(Date.now())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              오늘의 사주
            </button>
          </div>
          <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
            <p>
              <strong>총운:</strong> {dailyContent.overall}
            </p>
            <p>
              <strong>금전운:</strong> {dailyContent.wealth}
            </p>
            <p>
              <strong>일/학업운:</strong> {dailyContent.work}
            </p>
            <p>
              <strong>애정운:</strong> {dailyContent.love}
            </p>
            <p>
              <strong>건강운:</strong> {dailyContent.health}
            </p>
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-700">
            행운색: {dailyContent.luckyColor} · 길방: {dailyContent.luckyDirection}
          </p>
        </PageCard>
      )}

      {saveError && results.length === 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {saveError}
        </div>
      )}

      <AnimatePresence>
        {profile && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PageCard className="bg-gray-50/80">
              <p className="text-sm font-bold text-gray-900 mb-1">
                {weekKey} · 만세력 사주팔자 · {results.length}게임
              </p>
              <p className="text-xs text-gray-700 mb-3">{profile.engineNote}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {(
                  [
                    ["연주", profile.pillars.year, profile.pillars.yearHanja],
                    ["월주", profile.pillars.month, profile.pillars.monthHanja],
                    ["일주", profile.pillars.day, profile.pillars.dayHanja],
                    ["시주", profile.pillars.hour, profile.pillars.hourHanja],
                  ] as const
                ).map(([label, ko, hanja]) => (
                  <div key={label} className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
                    <p className="text-lg font-extrabold text-gray-900">{ko}</p>
                    <p className="text-sm text-gray-500">{hanja}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-gray-600 font-medium">일간(日干)</p>
                  <p className="text-lg font-extrabold text-gray-900">{profile.dayMaster}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 col-span-2 sm:col-span-1">
                  <p className="text-gray-600 font-medium">오행 분포</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug">{profile.elementSummary}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-gray-600 font-medium">띠 (연지)</p>
                  <p className="text-lg font-extrabold text-gray-900">
                    {profile.zodiacEasternEmoji} {profile.zodiacEastern}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-gray-600 font-medium">별자리</p>
                  <p className="text-lg font-extrabold text-gray-900">
                    {profile.zodiacWesternEmoji} {profile.zodiacWestern}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-gray-600 font-medium">혈액형</p>
                  <p className="text-lg font-extrabold text-gray-900">{profile.bloodLabel}</p>
                </div>
                {profile.voidBranches.length > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <p className="text-gray-600 font-medium">공망</p>
                    <p className="text-lg font-extrabold text-gray-900">
                      {profile.voidBranches.join(", ")}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                입력 시간: <strong>{profile.hourPillarLabel}</strong>
                <br />
                행운 후보 번호:{" "}
                <span className="font-bold text-gray-800">{profile.luckyPool.join(", ")}</span>
              </p>
              {externalStatus && (
                <p className="mt-2 text-xs font-medium text-gray-700">{externalStatus}</p>
              )}
            </PageCard>
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
                tone="violet"
              />
              <SendToSlipButton games={results} source="saju" />
            </div>

            <PageCard>
            <div className="space-y-2">
              {results.map((r, idx) => (
                <div key={idx} className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-800">#{idx + 1}</span>
                    <span className="text-sm text-gray-600">{r.summary}</span>
                  </div>
                  <div className="ball-row ball-row--fluid">
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
            </PageCard>
          </motion.div>
        )}
      </AnimatePresence>

      <SavedSourceList source="saju" title="저장된 사주 번호" />
    </div>
  );
}
