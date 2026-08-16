import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, RefreshCw, Plus, Trash2 } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import PageCard from "@/components/PageCard";
import PageGuideBar from "@/components/PageGuideBar";
import SajuGuideSheet from "@/components/SajuGuideSheet";
import SajuProfileCard from "@/components/SajuProfileCard";
import SazuTrustPanel from "@/components/SazuTrustPanel";
import {
  RecommendResultSaveActions,
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
  SAJU_PEOPLE_MAX,
  addSajuPerson,
  deleteSajuPerson,
  getActiveSajuPerson,
  loadSajuPeopleState,
  renameSajuPerson,
  setActiveSajuPersonId,
  sajuYearOptions,
  buildDailySajuContent,
  type BloodType,
  type SajuInput,
  type SajuPerson,
} from "@/utils/sajuLucky";
import { onSajuInputInvalidate, saveSajuProfileCloud } from "@/utils/sajuProfileCloud";
import { autoSaveGeneratedSets } from "@/utils/autoSaveNumbers";
import { isDuplicateNumberSets, fillUniqueForWeek } from "@/utils/savedNumbers";
import { useSavedSets } from "@/hooks/useSavedSets";

const GAME_COUNT = SAJU_DAILY_GAME_COUNT;
type SajuTab = "numbers" | "info";

function SajuPeopleChips({
  people,
  activeId,
  onSelectPerson,
  label = "누구의 번호인가요",
}: {
  people: SajuPerson[];
  activeId: string;
  onSelectPerson: (id: string) => void;
  label?: string;
}) {
  if (people.length <= 1) return null;
  return (
    <div className="saju-form__section">
      <span className="saju-form__label">{label}</span>
      <div className="saju-people" role="list">
        {people.map((person) => {
          const active = person.id === activeId;
          return (
            <button
              key={person.id}
              type="button"
              role="listitem"
              onClick={() => onSelectPerson(person.id)}
              className={`saju-people__btn${active ? " saju-people__btn--active" : ""}`}
              aria-pressed={active}
            >
              {person.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SajuInfoForm({
  people,
  activeId,
  personName,
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
  addName,
  onSelectPerson,
  onPersonNameChange,
  onAddNameChange,
  onAddPerson,
  onDeletePerson,
  onYearChange,
  onMonthChange,
  onDayChange,
  onBirthTimeChange,
  onBloodTypeChange,
  externalLoading,
  externalStatus,
}: {
  people: SajuPerson[];
  activeId: string;
  personName: string;
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
  addName: string;
  onSelectPerson: (id: string) => void;
  onPersonNameChange: (name: string) => void;
  onAddNameChange: (name: string) => void;
  onAddPerson: () => void;
  onDeletePerson: () => void;
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
        <h3 className="page-section-title">사주 정보</h3>
        <span
          className={`text-base font-bold transition-opacity shrink-0 ${
            inputSavedHint ? "text-gray-700 opacity-100" : "text-gray-400 opacity-80"
          }`}
        >
          {inputSavedHint ? "저장됨" : isSignedIn ? "계정 저장" : "자동 저장"}
        </span>
      </div>
      <p className="saju-input-card__hint">
        나와 다른 사람의 사주를 저장해 두고, 선택한 사주로 오늘 요일 행운번호를 받습니다.
        출생년도는 1900년부터 넣을 수 있습니다.
      </p>

      <SajuPeopleChips
        people={people}
        activeId={activeId}
        onSelectPerson={onSelectPerson}
        label="누구의 사주인가요"
      />

      {people.length < SAJU_PEOPLE_MAX ? (
        <div className="saju-form__section">
          <span className="saju-form__label">다른 사람 추가</span>
          <div className="saju-people__add">
            <input
              type="text"
              value={addName}
              onChange={(e) => onAddNameChange(e.target.value)}
              placeholder="이름 (예: 배우자, 엄마)"
              maxLength={12}
              className="saju-form__field"
              aria-label="추가할 이름"
            />
            <button
              type="button"
              onClick={onAddPerson}
              disabled={!addName.trim()}
              className="saju-people__add-btn"
            >
              <Plus className="w-5 h-5" aria-hidden />
              추가
            </button>
          </div>
        </div>
      ) : null}

      <div className="saju-form__section">
        <label className="saju-form__label" htmlFor="saju-person-name">
          이름
        </label>
        <div className="saju-people__name-row">
          <input
            id="saju-person-name"
            type="text"
            value={personName}
            onChange={(e) => onPersonNameChange(e.target.value)}
            maxLength={12}
            className="saju-form__field"
          />
          {people.length > 1 ? (
            <button
              type="button"
              onClick={onDeletePerson}
              className="saju-people__delete"
              aria-label={`${personName} 사주 삭제`}
            >
              <Trash2 className="w-5 h-5" aria-hidden />
              삭제
            </button>
          ) : null}
        </div>
      </div>

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
  const initialPeople = loadSajuPeopleState();
  const initialPerson = getActiveSajuPerson(initialPeople);
  const [tab, setTab] = useState<SajuTab>("numbers");
  const [people, setPeople] = useState(initialPeople.people);
  const [activeId, setActiveId] = useState(initialPeople.activeId);
  const [personName, setPersonName] = useState(initialPerson.name);
  const [addName, setAddName] = useState("");
  const [year, setYear] = useState(initialPerson.year);
  const [month, setMonth] = useState(initialPerson.month);
  const [day, setDay] = useState(initialPerson.day);
  const [hour, setHour] = useState(initialPerson.hour);
  const [minute, setMinute] = useState(initialPerson.minute);
  const [bloodType, setBloodType] = useState<BloodType>(initialPerson.bloodType);
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

  function applyPerson(person: SajuPerson) {
    skipAutoSaveRef.current = true;
    setActiveId(person.id);
    setPersonName(person.name);
    setYear(person.year);
    setMonth(person.month);
    setDay(person.day);
    setHour(person.hour);
    setMinute(person.minute);
    setBloodType(person.bloodType);
    window.setTimeout(() => {
      skipAutoSaveRef.current = false;
    }, 0);
  }

  function applyPeopleState(state: { activeId: string; people: SajuPerson[] }) {
    setPeople(state.people);
    const active = state.people.find((p) => p.id === state.activeId) ?? state.people[0];
    if (active) applyPerson(active);
  }

  function markInfoReady() {
    markSajuInfoReady();
    setInfoReady(true);
  }

  function handleInputChange<T>(setter: (value: T) => void, value: T) {
    markInfoReady();
    setter(value);
  }

  function handleSelectPerson(id: string) {
    const state = setActiveSajuPersonId(id);
    applyPeopleState(state);
    markInfoReady();
  }

  function handleAddPerson() {
    const name = addName.trim();
    if (!name) return;
    const state = addSajuPerson(name);
    setAddName("");
    applyPeopleState(state);
    markInfoReady();
    setTab("info");
  }

  function handlePersonNameChange(name: string) {
    setPersonName(name);
    if (!name.trim()) return;
    const state = renameSajuPerson(activeId, name);
    setPeople(state.people);
    markInfoReady();
  }

  function handleDeletePerson() {
    const state = deleteSajuPerson(activeId);
    applyPeopleState(state);
  }

  useEffect(() => {
    const reload = () => {
      applyPeopleState(loadSajuPeopleState());
      if (loadSajuInput()) markInfoReady();
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
    const named = loadSajuPeopleState();
    setPeople(named.people);
    if (isSignedIn && user) {
      void saveSajuProfileCloud(user.uid, payload);
    }
    setInputSavedHint(true);
    const t = setTimeout(() => setInputSavedHint(false), 1200);
    return () => clearTimeout(t);
  }, [input, daysInMonth, day, isSignedIn, user]);

  useEffect(() => {
    const daily = loadDailySajuGames(today, activeId);
    if (!daily || daily.games.length === 0) {
      setResults([]);
      setProfileReady(false);
      setSaved(false);
      setIsDuplicate(false);
      setSaveError(null);
      return;
    }
    setResults(daily.games);
    setProfileReady(true);
    setSaved(false);
    setSaveError(null);
    markInfoReady();
    void isDuplicateNumberSets(daily.games, existingSets).then(setIsDuplicate);
  }, [existingSets, dayKey, today, activeId]);

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

  const years = useMemo(() => sajuYearOptions(), []);

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
        saveDailySajuGames(games, safeInput, today, activeId);
        const dup = await isDuplicateNumberSets(games, existingSets);
        setIsDuplicate(dup);
        if (!dup) {
          const saveResult = await autoSaveGeneratedSets(
            games,
            `사주 · ${personName} · ${weekdayLabel}요일 행운번호 ${GAME_COUNT}게임`,
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
      `사주 · ${personName} · ${weekdayLabel}요일 행운번호 ${GAME_COUNT}게임`,
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
          사주 정보
        </button>
      </div>

      {tab === "info" ? (
        <SajuInfoForm
          people={people}
          activeId={activeId}
          personName={personName}
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
          addName={addName}
          onSelectPerson={handleSelectPerson}
          onPersonNameChange={handlePersonNameChange}
          onAddNameChange={setAddName}
          onAddPerson={handleAddPerson}
          onDeletePerson={handleDeletePerson}
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
          {people.length > 1 ? (
            <PageCard className="saju-input-card">
              <SajuPeopleChips
                people={people}
                activeId={activeId}
                onSelectPerson={handleSelectPerson}
                label="누구의 번호인가요"
              />
              <p className="saju-input-card__hint">
                {hasToday
                  ? `지금 보는 번호는 「${personName}」의 오늘 번호입니다. 다른 이름을 고르면 그 사람 번호를 받을 수 있습니다.`
                  : `「${personName}」을 선택한 뒤 아래 버튼으로 오늘 번호를 받으세요.`}
              </p>
            </PageCard>
          ) : null}

          {!infoReady ? (
            <p className="saju-page__notice" role="status">
              번호를 받기 전에 <strong>사주 정보</strong> 탭에서 나와 가족·지인의 생년월일·출생 시간·혈액형을
              입력해 주세요.
              <button type="button" className="saju-page__notice-btn" onClick={() => setTab("info")}>
                사주 정보 입력하러 가기
              </button>
            </p>
          ) : null}

          {hasToday && people.length <= 1 ? (
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
                <SajuProfileCard
                  profile={profile}
                  periodLabel={dayTag}
                  gameCount={results.length}
                  personName={personName}
                />

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
                  <RecommendResultSaveActions
                    className="mt-4"
                    saved={saved}
                    isDuplicate={isDuplicate}
                    saveError={saveError}
                    onSave={() => void handleSave()}
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || !infoReady}
                    className="page-cta page-cta--secondary page-cta--large w-full mt-3 disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <RotateCcw className="w-5 h-5 animate-spin" />
                        계산 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {personName} 번호 다시 받기
                      </>
                    )}
                  </button>
                </PageCard>
              </motion.div>
            )}
          </AnimatePresence>

          {results.length === 0 ? (
            <RecommendStickyFooter>
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
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {personName} · 오늘({weekdayLabel}) 행운번호 {GAME_COUNT}게임 받기
                  </>
                )}
              </button>
            </RecommendStickyFooter>
          ) : null}
        </>
      )}
    </div>
  );
}
