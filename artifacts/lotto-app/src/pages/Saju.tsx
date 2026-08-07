import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, RefreshCw } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import PageCard from "@/components/PageCard";
import PageGuideBar from "@/components/PageGuideBar";
import SajuGuideSheet from "@/components/SajuGuideSheet";
import SajuProfileCard from "@/components/SajuProfileCard";
import SazuTrustPanel from "@/components/SazuTrustPanel";
import {
  RecommendFooterSaveActions,
  RecommendStickyFooter,
} from "@/components/RecommendSaveActions";
import type { GeneratedNumbers } from "@/data/types";
import { useAuth } from "@/context/AuthContext";
import { fetchSazuAnalyze, isSazuConfigured } from "@/lib/sazuApi";
import {
  BLOOD_OPTIONS,
  buildSajuProfile,
  formatSajuDayTag,
  generateSajuLuckyGames,
  getSajuDayKey,
  getSajuWeekKey,
  getSajuWeekdayLabel,
  isSajuInfoReady,
  loadDailySajuGames,
  loadSajuInput,
  markSajuInfoReady,
  saveDailySajuGames,
  saveSajuInput,
  SAJU_DAILY_GAME_COUNT,
  buildDailySajuContent,
  type BloodType,
  type SajuInput,
} from "@/utils/sajuLucky";
import { onSajuInputInvalidate, saveSajuProfileCloud } from "@/utils/sajuProfileCloud";
import { autoSaveGeneratedSets } from "@/utils/autoSaveNumbers";
import { isDuplicateNumberSets, fillUniqueForWeek } from "@/utils/savedNumbers";
import { useSavedSets } from "@/hooks/useSavedSets";

const GAME_COUNT = SAJU_DAILY_GAME_COUNT;
type SajuTab = "numbers" | "info";

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

function SajuInfoForm({
  year,
  month,
  day,
  hour,
  minute,
  bloodType,
  daysInMonth,
  years,
  birthTimeValue,
  inputSavedHint,
  isSignedIn,
  onYearChange,
  onMonthChange,
  onDayChange,
  onBirthTimeChange,
  onBloodTypeChange,
  externalLoading,
  externalStatus,
}: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  bloodType: BloodType;
  daysInMonth: number;
  years: number[];
  birthTimeValue: string;
  inputSavedHint: boolean;
  isSignedIn: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDayChange: (day: number) => void;
  onBirthTimeChange: (value: string) => void;
  onBloodTypeChange: (bloodType: BloodType) => void;
  externalLoading: boolean;
  externalStatus: string | null;
}) {
  return (
    <PageCard className="saju-input-card">
      <div className="saju-input-card__head">
        <h3 className="page-section-title">내 정보 입력</h3>
        <span
          className={`text-base font-bold transition-opacity shrink-0 ${
            inputSavedHint ? "text-gray-700 opacity-100" : "text-gray-400 opacity-80"
          }`}
        >
          {inputSavedHint ? "저장됨" : isSignedIn ? "계정 저장" : "자동 저장"}
        </span>
      </div>
      <p className="saju-input-card__hint">
        생년월일·출생 시간·혈액형으로 오늘 요일 행운번호를 추천합니다
      </p>

      <div className="saju-form__section">
        <span className="saju-form__label">생년월일</span>
        <div className="saju-form__date-grid">
          <label className="block min-w-0">
            <span className="sr-only">출생년도</span>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="saju-form__field"
              aria-label="출생년도"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="sr-only">월</span>
            <select
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="saju-form__field"
              aria-label="월"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="sr-only">일</span>
            <select
              value={Math.min(day, daysInMonth)}
              onChange={(e) => onDayChange(Number(e.target.value))}
              className="saju-form__field"
              aria-label="일"
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="saju-form__section">
        <label className="saju-form__label" htmlFor="saju-birth-time">
          출생 시간
        </label>
        <input
          id="saju-birth-time"
          type="time"
          value={birthTimeValue}
          onChange={(e) => onBirthTimeChange(e.target.value)}
          className="saju-form__field"
        />
        <p className="text-base font-semibold text-muted-readable">
          모르면 낮 12시(정오)로 두셔도 됩니다
        </p>
      </div>

      <fieldset className="saju-form__section">
        <legend className="saju-form__label mb-2">혈액형</legend>
        <div className="saju-form__blood-grid">
          {BLOOD_OPTIONS.map((b) => {
            const active = bloodType === b.value;
            return (
              <button
                key={b.value}
                type="button"
                onClick={() => onBloodTypeChange(b.value)}
                className={`saju-form__blood-btn ${
                  active ? "saju-form__blood-btn--active" : "saju-form__blood-btn--idle"
                }`}
                aria-pressed={active}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {isSazuConfigured() ? (
        <SazuTrustPanel loading={externalLoading} status={externalStatus} />
      ) : null}
    </PageCard>
  );
}

export default function Saju() {
  const { user, isSignedIn } = useAuth();
  const initial = defaultInput();
  const [tab, setTab] = useState<SajuTab>("numbers");
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [bloodType, setBloodType] = useState<BloodType>(initial.bloodType);
  const [results, setResults] = useState<GeneratedNumbers[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [infoReady, setInfoReady] = useState(
    () => isSajuInfoReady() || loadSajuInput() !== null,
  );
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
  const skipAutoSaveRef = useRef(true);

  const weekKey = useMemo(() => getSajuWeekKey(), []);
  const today = useMemo(() => new Date(dailyTick), [dailyTick]);
  const dayKey = useMemo(() => getSajuDayKey(today), [today]);
  const dayTag = useMemo(() => formatSajuDayTag(today), [today]);
  const weekdayLabel = useMemo(() => getSajuWeekdayLabel(today), [today]);

  const input: SajuInput = useMemo(
    () => ({ year, month, day, hour, minute, bloodType }),
    [year, month, day, hour, minute, bloodType],
  );

  const birthTimeValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  function applyInput(next: SajuInput) {
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
    setHour(next.hour);
    setMinute(next.minute);
    setBloodType(next.bloodType);
  }

  function markInfoReady() {
    markSajuInfoReady();
    setInfoReady(true);
  }

  function handleInputChange<T>(setter: (value: T) => void, value: T) {
    markInfoReady();
    setter(value);
  }

  useEffect(() => {
    const reload = () => {
      const saved = loadSajuInput();
      if (saved) {
        applyInput(saved);
        markInfoReady();
      }
    };
    reload();
    return onSajuInputInvalidate(reload);
  }, []);

  function handleBirthTimeChange(value: string) {
    const [h, m] = value.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    markInfoReady();
    setHour(Math.min(23, Math.max(0, h)));
    setMinute(Math.min(59, Math.max(0, m)));
  }

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  useEffect(() => {
    const safeDay = Math.min(day, daysInMonth);
    const payload: SajuInput = { ...input, day: safeDay };
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    saveSajuInput(payload);
    if (isSignedIn && user) {
      void saveSajuProfileCloud(user.uid, payload);
    }
    setInputSavedHint(true);
    const t = setTimeout(() => setInputSavedHint(false), 1200);
    return () => clearTimeout(t);
  }, [input, daysInMonth, day, isSignedIn, user]);

  useEffect(() => {
    const daily = loadDailySajuGames(today);
    if (!daily || daily.games.length === 0) {
      setResults([]);
      setProfileReady(false);
      setSaved(false);
      return;
    }
    setResults(daily.games);
    setProfileReady(true);
    markInfoReady();
    void isDuplicateNumberSets(daily.games, existingSets).then(setIsDuplicate);
  }, [existingSets, dayKey, today]);

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
    () => (previewProfile ? buildDailySajuContent(previewProfile, today) : null),
    [previewProfile, today],
  );
  const dailyDateText = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      }).format(today),
    [today],
  );

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 1930 + 1 }, (_, i) => now - i);
  }, []);

  const hasToday = results.length === GAME_COUNT;

  function handleGenerate() {
    if (!infoReady) {
      setTab("info");
      return;
    }

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
        const factory = () => generateSajuLuckyGames(p, 1, today)[0];
        const games = fillUniqueForWeek(
          generateSajuLuckyGames(p, GAME_COUNT, today),
          GAME_COUNT,
          factory,
          existingSets,
        );
        setProfileReady(true);
        setResults(games);
        saveDailySajuGames(games, safeInput, today);
        const dup = await isDuplicateNumberSets(games, existingSets);
        setIsDuplicate(dup);
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
    const dup = await isDuplicateNumberSets(results, existingSets);
    if (dup) {
      setIsDuplicate(true);
      return;
    }
    const saveResult = await autoSaveGeneratedSets(
      results,
      `사주 · ${weekdayLabel}요일 행운번호 ${GAME_COUNT}게임`,
    );
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
    <div className={`page-content saju-page${tab === "numbers" ? " page-content--generator" : ""}`}>
      <PageGuideBar
        tag={`${weekKey} · ${weekdayLabel}요일 사주`}
        guideLabel="사주 설명"
        onGuide={() => setShowGuide(true)}
      />

      <SajuGuideSheet open={showGuide} onClose={() => setShowGuide(false)} />

      <div className="win-page-tabs saju-page__tabs" role="tablist" aria-label="사주 메뉴">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "numbers"}
          className={`win-page-tabs__btn${tab === "numbers" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("numbers")}
        >
          사주 번호
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "info"}
          className={`win-page-tabs__btn${tab === "info" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("info")}
        >
          내 정보
        </button>
      </div>

      {tab === "info" ? (
        <SajuInfoForm
          year={year}
          month={month}
          day={day}
          hour={hour}
          minute={minute}
          bloodType={bloodType}
          daysInMonth={daysInMonth}
          years={years}
          birthTimeValue={birthTimeValue}
          inputSavedHint={inputSavedHint}
          isSignedIn={isSignedIn}
          onYearChange={(value) => handleInputChange(setYear, value)}
          onMonthChange={(value) => handleInputChange(setMonth, value)}
          onDayChange={(value) => handleInputChange(setDay, value)}
          onBirthTimeChange={handleBirthTimeChange}
          onBloodTypeChange={(value) => handleInputChange(setBloodType, value)}
          externalLoading={externalLoading}
          externalStatus={externalStatus}
        />
      ) : (
        <>
          {!infoReady ? (
            <p className="saju-page__notice" role="status">
              번호를 받기 전에 <strong>내 정보</strong> 탭에서 생년월일·출생 시간·혈액형을
              입력해 주세요.
              <button type="button" className="saju-page__notice-btn" onClick={() => setTab("info")}>
                내 정보 입력하러 가기
              </button>
            </p>
          ) : null}

          {hasToday ? (
            <PageCard className="saju-input-card">
              <p className="text-base text-center text-muted-readable font-semibold">
                오늘({dayTag}) 번호 · 다시 받기 시 교체
              </p>
            </PageCard>
          ) : null}

          {dailyContent && (
            <PageCard className="saju-daily-card">
              <div className="saju-daily-card__head">
                <h4 className="saju-daily-card__title">
                  {dailyContent.title}
                  <span className="saju-daily-card__date">{dailyDateText}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setDailyTick(Date.now())}
                  className="saju-daily-card__refresh"
                  aria-label="오늘의 사주 새로고침"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="saju-daily-card__summary">
                <strong>총운</strong> {dailyContent.overall}
                {" · "}
                <strong>금전</strong> {dailyContent.wealth}
                {" · "}
                <strong>일</strong> {dailyContent.work}
                {" · "}
                <strong>애정</strong> {dailyContent.love}
                {" · "}
                <strong>건강</strong> {dailyContent.health}
                {" · "}
                <strong>행운색</strong> {dailyContent.luckyColor}
                {" · "}
                <strong>길방</strong> {dailyContent.luckyDirection}
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
                <SajuProfileCard profile={profile} periodLabel={dayTag} gameCount={results.length} />

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
                disabled={generating || !infoReady}
                className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin" />
                    계산 중...
                  </>
                ) : hasToday ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    오늘({weekdayLabel}) 행운번호 {GAME_COUNT}게임 다시 받기
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    오늘({weekdayLabel}) 행운번호 {GAME_COUNT}게임 받기
                  </>
                )}
              </button>
            )}
          </RecommendStickyFooter>
        </>
      )}
    </div>
  );
}
