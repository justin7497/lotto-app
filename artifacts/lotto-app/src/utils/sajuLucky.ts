/**
 * 사주 행운번호 — 오픈소스 manseryeok(KASI 정본)으로 사주팔자 계산.
 * 외부 유료 API 없음. 별자리·혈액형은 앱 내 규칙, 사주는 manseryeok.
 */

import {
  calculateFourPillars,
  type EarthlyBranch,
  type FiveElement,
  type HeavenlyStem,
} from "manseryeok";
import type { GeneratedNumbers, LottoNumbers } from "@/data/types";
import { dedupeGeneratedNumberSets, numberSetKey } from "@/utils/savedNumbers";

export type BloodType = "A" | "B" | "O" | "AB" | "unknown";

export interface SajuInput {
  year: number;
  month: number;
  day: number;
  /** 출생 시각 (0~23) */
  hour: number;
  /** 출생 분 (0~59) */
  minute: number;
  bloodType: BloodType;
}

export interface SajuPillarsView {
  year: string;
  month: string;
  day: string;
  hour: string;
  yearHanja: string;
  monthHanja: string;
  dayHanja: string;
  hourHanja: string;
  fullText: string;
}

export interface SajuProfile {
  pillars: SajuPillarsView;
  dayMaster: string;
  dayMasterElement: string;
  elementSummary: string;
  elementCounts: Record<FiveElement, number>;
  voidBranches: string[];
  zodiacWestern: string;
  zodiacWesternEmoji: string;
  zodiacEastern: string;
  zodiacEasternEmoji: string;
  hourPillarLabel: string;
  bloodType: BloodType;
  bloodLabel: string;
  summary: string;
  luckyPool: number[];
  /** 계산 엔진 안내 */
  engineNote: string;
}

export interface DailySajuContent {
  title: string;
  overall: string;
  wealth: string;
  work: string;
  love: string;
  health: string;
  luckyColor: string;
  luckyDirection: string;
}

const BRANCH_ANIMAL: Record<
  EarthlyBranch,
  { name: string; emoji: string; nums: number[] }
> = {
  자: { name: "쥐", emoji: "🐀", nums: [1, 13, 25, 37] },
  축: { name: "소", emoji: "🐂", nums: [2, 14, 26, 38] },
  인: { name: "호랑이", emoji: "🐅", nums: [3, 15, 27, 39] },
  묘: { name: "토끼", emoji: "🐇", nums: [4, 16, 28, 40] },
  진: { name: "용", emoji: "🐉", nums: [5, 17, 29, 41] },
  사: { name: "뱀", emoji: "🐍", nums: [6, 18, 30, 42] },
  오: { name: "말", emoji: "🐴", nums: [7, 19, 31, 43] },
  미: { name: "양", emoji: "🐑", nums: [8, 20, 32, 44] },
  신: { name: "원숭이", emoji: "🐒", nums: [9, 21, 33, 45] },
  유: { name: "닭", emoji: "🐓", nums: [10, 22, 34] },
  술: { name: "개", emoji: "🐕", nums: [11, 23, 35] },
  해: { name: "돼지", emoji: "🐖", nums: [12, 24, 36] },
};

const ELEMENT_LABEL: Record<FiveElement, string> = {
  목: "목(木)",
  화: "화(火)",
  토: "토(土)",
  금: "금(金)",
  수: "수(水)",
};

const ELEMENT_NUMS: Record<FiveElement, number[]> = {
  목: [3, 8, 13, 18, 23, 28, 33, 38, 43],
  화: [2, 7, 12, 17, 22, 27, 32, 37, 42],
  토: [5, 10, 15, 20, 25, 30, 35, 40, 45],
  금: [4, 9, 14, 19, 24, 29, 34, 39, 44],
  수: [1, 6, 11, 16, 21, 26, 31, 36, 41],
};

const STEM_NUMS: Record<HeavenlyStem, number[]> = {
  갑: [1, 11, 21, 31, 41],
  을: [2, 12, 22, 32, 42],
  병: [3, 13, 23, 33, 43],
  정: [4, 14, 24, 34, 44],
  무: [5, 15, 25, 35, 45],
  기: [6, 16, 26, 36],
  경: [7, 17, 27, 37],
  신: [8, 18, 28, 38],
  임: [9, 19, 29, 39],
  계: [10, 20, 30, 40],
};

const WESTERN: {
  name: string;
  emoji: string;
  start: [number, number];
  end: [number, number];
  nums: number[];
}[] = [
  { name: "염소자리", emoji: "♑", start: [12, 22], end: [1, 19], nums: [1, 8, 15, 22, 29, 36, 43] },
  { name: "물병자리", emoji: "♒", start: [1, 20], end: [2, 18], nums: [2, 9, 16, 23, 30, 37, 44] },
  { name: "물고기자리", emoji: "♓", start: [2, 19], end: [3, 20], nums: [3, 10, 17, 24, 31, 38, 45] },
  { name: "양자리", emoji: "♈", start: [3, 21], end: [4, 19], nums: [4, 11, 18, 25, 32, 39] },
  { name: "황소자리", emoji: "♉", start: [4, 20], end: [5, 20], nums: [5, 12, 19, 26, 33, 40] },
  { name: "쌍둥이자리", emoji: "♊", start: [5, 21], end: [6, 21], nums: [6, 13, 20, 27, 34, 41] },
  { name: "게자리", emoji: "♋", start: [6, 22], end: [7, 22], nums: [7, 14, 21, 28, 35, 42] },
  { name: "사자자리", emoji: "♌", start: [7, 23], end: [8, 22], nums: [1, 8, 15, 22, 29, 36, 43] },
  { name: "처녀자리", emoji: "♍", start: [8, 23], end: [9, 22], nums: [2, 9, 16, 23, 30, 37, 44] },
  { name: "천칭자리", emoji: "♎", start: [9, 23], end: [10, 22], nums: [3, 10, 17, 24, 31, 38, 45] },
  { name: "전갈자리", emoji: "♏", start: [10, 23], end: [11, 21], nums: [4, 11, 18, 25, 32, 39] },
  { name: "사수자리", emoji: "♐", start: [11, 22], end: [12, 21], nums: [5, 12, 19, 26, 33, 40] },
];

/** 전통 12시진 (선택 UI용) */
export const HOUR_PILLARS: { label: string; branch: EarthlyBranch; startHour: number }[] = [
  { label: "자시 (23~01시)", branch: "자", startHour: 23 },
  { label: "축시 (01~03시)", branch: "축", startHour: 1 },
  { label: "인시 (03~05시)", branch: "인", startHour: 3 },
  { label: "묘시 (05~07시)", branch: "묘", startHour: 5 },
  { label: "진시 (07~09시)", branch: "진", startHour: 7 },
  { label: "사시 (09~11시)", branch: "사", startHour: 9 },
  { label: "오시 (11~13시)", branch: "오", startHour: 11 },
  { label: "미시 (13~15시)", branch: "미", startHour: 13 },
  { label: "신시 (15~17시)", branch: "신", startHour: 15 },
  { label: "유시 (17~19시)", branch: "유", startHour: 17 },
  { label: "술시 (19~21시)", branch: "술", startHour: 19 },
  { label: "해시 (21~23시)", branch: "해", startHour: 21 },
];

const BLOOD: Record<BloodType, { label: string; nums: number[] }> = {
  A: { label: "A형", nums: [1, 6, 11, 16, 21, 26, 31, 36, 41] },
  B: { label: "B형", nums: [2, 7, 12, 17, 22, 27, 32, 37, 42] },
  O: { label: "O형", nums: [3, 8, 13, 18, 23, 28, 33, 38, 43] },
  AB: { label: "AB형", nums: [4, 5, 9, 14, 19, 24, 29, 34, 39, 44] },
  unknown: { label: "모름", nums: [5, 10, 15, 20, 25, 30, 35, 40, 45] },
};

function inRange(month: number, day: number, start: [number, number], end: [number, number]): boolean {
  const v = month * 100 + day;
  const s = start[0] * 100 + start[1];
  const e = end[0] * 100 + end[1];
  if (s <= e) return v >= s && v <= e;
  return v >= s || v <= e;
}

export function getWesternZodiac(month: number, day: number) {
  for (const z of WESTERN) {
    if (inRange(month, day, z.start, z.end)) return z;
  }
  return WESTERN[0];
}

/** 시진 시작 시각 → manseryeok용 시·분(구간 중앙) */
export function pillarStartToClock(startHour: number): { hour: number; minute: number } {
  if (startHour === 23) return { hour: 23, minute: 30 };
  return { hour: (startHour + 1) % 24, minute: 0 };
}

export function getHourPillarLabel(startHour: number): string {
  return HOUR_PILLARS.find((p) => p.startHour === startHour)?.label ?? "오시 (11~13시)";
}

/** 시·분 → 해당 시진 시작 시각 */
export function clockToPillarStartHour(hour: number, minute: number): number {
  const mins = hour * 60 + minute;
  if (mins >= 23 * 60 || mins < 60) return 23;
  if (mins < 3 * 60) return 1;
  if (mins < 5 * 60) return 3;
  if (mins < 7 * 60) return 5;
  if (mins < 9 * 60) return 7;
  if (mins < 11 * 60) return 9;
  if (mins < 13 * 60) return 11;
  if (mins < 15 * 60) return 13;
  if (mins < 17 * 60) return 15;
  if (mins < 19 * 60) return 17;
  if (mins < 21 * 60) return 19;
  return 21;
}

export function formatClockTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getClockTimeLabel(hour: number, minute: number): string {
  const pillar = getHourPillarLabel(clockToPillarStartHour(hour, minute));
  return `${formatClockTime(hour, minute)} (${pillar})`;
}

function normalizeSajuInput(data: Partial<SajuInput> & { hour?: number; minute?: number }): SajuInput | null {
  if (!data.year || !data.month || !data.day) return null;
  const rawBlood = data.bloodType ?? "A";
  const bloodType: BloodType = rawBlood === "unknown" ? "A" : rawBlood;
  let hour = typeof data.hour === "number" ? data.hour : 12;
  let minute = typeof data.minute === "number" ? data.minute : 0;

  // 구버전: 시진 시작 시각만 저장됨 (23, 1, 3, …)
  if (data.minute === undefined && HOUR_PILLARS.some((p) => p.startHour === hour)) {
    const clock = pillarStartToClock(hour);
    hour = clock.hour;
    minute = clock.minute;
  }

  hour = Math.min(23, Math.max(0, Math.floor(hour)));
  minute = Math.min(59, Math.max(0, Math.floor(minute)));
  return { year: data.year, month: data.month, day: data.day, hour, minute, bloodType };
}

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => n >= 1 && n <= 45))].sort((a, b) => a - b);
}

function countElements(
  pairs: { stem: FiveElement; branch: FiveElement }[],
): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pairs) {
    counts[p.stem] += 1;
    counts[p.branch] += 1;
  }
  return counts;
}

export function buildSajuProfile(input: SajuInput): SajuProfile {
  const hour = input.hour;
  const minute = input.minute;
  const fp = calculateFourPillars({
    year: input.year,
    month: input.month,
    day: input.day,
    hour,
    minute,
    dayBoundary: "midnight",
  });

  const western = getWesternZodiac(input.month, input.day);
  const blood = BLOOD[input.bloodType] ?? BLOOD.unknown;
  const yearBranch = fp.year.earthlyBranch;
  const animal = BRANCH_ANIMAL[yearBranch];
  const dayStem = fp.day.heavenlyStem;
  const dayStemEl = fp.dayElement.stem;

  const elementCounts = countElements([
    fp.yearElement,
    fp.monthElement,
    fp.dayElement,
    fp.hourElement,
  ]);

  // 일간 오행·연지(띠)·시지·강한 오행·혈액형·별자리로 행운 풀 구성
  const dominant = (Object.entries(elementCounts) as [FiveElement, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];

  const luckyPool = uniqueSorted([
    ...ELEMENT_NUMS[dayStemEl],
    ...ELEMENT_NUMS[dominant],
    ...STEM_NUMS[dayStem],
    ...BRANCH_ANIMAL[yearBranch].nums,
    ...BRANCH_ANIMAL[fp.hour.earthlyBranch].nums,
    ...BRANCH_ANIMAL[fp.day.earthlyBranch].nums,
    ...western.nums.slice(0, 4),
    ...blood.nums.slice(0, 4),
  ]);

  const elementSummary = (Object.keys(elementCounts) as FiveElement[])
    .map((el) => `${ELEMENT_LABEL[el]} ${elementCounts[el]}`)
    .join(" · ");

  const pillars: SajuPillarsView = {
    year: fp.yearString,
    month: fp.monthString,
    day: fp.dayString,
    hour: fp.hourString,
    yearHanja: fp.yearHanja,
    monthHanja: fp.monthHanja,
    dayHanja: fp.dayHanja,
    hourHanja: fp.hourHanja,
    fullText: fp.toString(),
  };

  return {
    pillars,
    dayMaster: `${dayStem} (${ELEMENT_LABEL[dayStemEl]})`,
    dayMasterElement: ELEMENT_LABEL[dayStemEl],
    elementSummary,
    elementCounts,
    voidBranches: fp.voidBranches.map(String),
    zodiacWestern: western.name,
    zodiacWesternEmoji: western.emoji,
    zodiacEastern: `${animal.name}띠`,
    zodiacEasternEmoji: animal.emoji,
    hourPillarLabel: getClockTimeLabel(hour, minute),
    bloodType: input.bloodType,
    bloodLabel: blood.label,
    summary: `${pillars.fullText} · ${animal.name}띠 · ${western.name}`,
    luckyPool,
    engineNote: "manseryeok 오픈소스 (한국천문연구원 KASI 정본 데이터)",
  };
}

export const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function getKstDateParts(date = new Date()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const KST = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + KST);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    weekday: kst.getUTCDay(),
  };
}

export function getSajuDayKey(date = new Date()): string {
  const { year, month, day } = getKstDateParts(date);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

export function getSajuWeekdayLabel(date = new Date()): string {
  const { weekday } = getKstDateParts(date);
  return KOREAN_WEEKDAYS[weekday];
}

export function formatSajuDayTag(date = new Date()): string {
  const { year, month, day, weekday } = getKstDateParts(date);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}.${m}.${d} (${KOREAN_WEEKDAYS[weekday]})`;
}

export function buildDailySajuContent(profile: SajuProfile, date = new Date()): DailySajuContent {
  const { weekday: day } = getKstDateParts(date);
  const topElement = (Object.entries(profile.elementCounts) as [FiveElement, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
  const weakElement = (Object.entries(profile.elementCounts) as [FiveElement, number][])
    .sort((a, b) => a[1] - b[1])[0][0];

  const colorByElement: Record<FiveElement, string> = {
    목: "그린",
    화: "레드",
    토: "옐로우",
    금: "화이트",
    수: "네이비",
  };
  const directionByDay = ["북", "북동", "동", "남동", "남", "남서", "서"] as const;
  const paceByDay = ["천천히", "차분히", "유연하게", "집중해서", "과감하게", "신중하게", "정리하며"];

  return {
    title: "오늘의 사주",
    overall: `${profile.dayMaster} · ${paceByDay[day]}`,
    wealth: `금전 · ${profile.luckyPool.slice(0, 3).join(", ")}`,
    work: `일 · ${ELEMENT_LABEL[topElement]} 강세`,
    love: `애정 · ${profile.zodiacEastern}`,
    health: `건강 · ${ELEMENT_LABEL[weakElement]} 보완`,
    luckyColor: colorByElement[topElement],
    luckyDirection: directionByDay[day],
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWeighted(weights: Float32Array): number {
  let sum = 0;
  for (let i = 1; i <= 45; i++) sum += weights[i];
  let r = Math.random() * sum;
  for (let i = 1; i <= 45; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 45;
}

export function generateSajuLuckyGames(
  profile: SajuProfile,
  gameCount = 5,
  date = new Date(),
): GeneratedNumbers[] {
  const { weekday } = getKstDateParts(date);
  const weekdayLabel = KOREAN_WEEKDAYS[weekday];
  const weights = new Float32Array(46);
  for (let i = 1; i <= 45; i++) weights[i] = 1;
  for (const n of profile.luckyPool) weights[n] += 5;
  if (profile.luckyPool.length > 0) {
    for (let i = 0; i < 6; i++) {
      const n = profile.luckyPool[(weekday * 5 + i * 7) % profile.luckyPool.length];
      weights[n] += 3;
    }
  }

  const results: GeneratedNumbers[] = [];
  const usedKeys = new Set<string>();

  for (let g = 0; g < gameCount; g++) {
    let best: number[] | null = null;
    for (let attempt = 0; attempt < 80; attempt++) {
      const picked = new Set<number>();
      const prefer = shuffle(profile.luckyPool).slice(0, 2 + (attempt % 3));
      for (const n of prefer) {
        if (picked.size >= 6) break;
        picked.add(n);
      }
      let guard = 0;
      while (picked.size < 6 && guard++ < 40) {
        picked.add(pickWeighted(weights));
      }
      if (picked.size !== 6) continue;
      const nums = [...picked].sort((a, b) => a - b);
      const key = numberSetKey(nums);
      if (usedKeys.has(key)) continue;
      best = nums;
      break;
    }
    if (!best) {
      let guard = 0;
      while (guard++ < 80) {
        const candidate = shuffle(Array.from({ length: 45 }, (_, i) => i + 1))
          .slice(0, 6)
          .sort((a, b) => a - b);
        const key = numberSetKey(candidate);
        if (!usedKeys.has(key)) {
          best = candidate;
          break;
        }
      }
    }
    if (!best) break;
    usedKeys.add(numberSetKey(best));
    const fromPool = best.filter((n) => profile.luckyPool.includes(n)).length;
    results.push({
      numbers: best as LottoNumbers,
      mode: "saju",
      summary: `${weekdayLabel}요일 · 사주풀 ${fromPool}개`,
    });
  }

  return dedupeGeneratedNumberSets(results);
}

export const BLOOD_OPTIONS: { value: BloodType; label: string }[] = [
  { value: "A", label: "A형" },
  { value: "B", label: "B형" },
  { value: "O", label: "O형" },
  { value: "AB", label: "AB형" },
];

const STORAGE_KEY = "lotto_saju_profile_v2";
const INFO_READY_KEY = "lotto_saju_info_ready_v1";
const DAILY_KEY = "lotto_saju_daily_v1";
const WEEKLY_KEY = "lotto_saju_weekly_v1";

/** 로또 회차(주간) 키 — 나의 번호 roundTag와 동일 기준 */
export function getSajuWeekKey(): string {
  const BASE_ROUND = 1231;
  const KST = 9 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const BASE_KST_DAY = new Date("2026-07-04T00:00:00+09:00").getTime();
  const nowKST = Date.now() + KST;
  const todayKSTDay = Math.floor(nowKST / ONE_DAY) * ONE_DAY - KST;
  const diffDays = Math.round((todayKSTDay - BASE_KST_DAY) / ONE_DAY);
  const weeksSince = diffDays <= 0 ? 0 : Math.ceil(diffDays / 7);
  const roundNo = BASE_ROUND + weeksSince;
  const drawDateUTC = new Date(BASE_KST_DAY + weeksSince * 7 * ONE_DAY + KST);
  const drawDate = `${drawDateUTC.getUTCFullYear()}.${String(drawDateUTC.getUTCMonth() + 1).padStart(2, "0")}.${String(drawDateUTC.getUTCDate()).padStart(2, "0")}`;
  return `제${roundNo}회 (${drawDate})`;
}

export function loadSajuInput(): SajuInput | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("lotto_saju_profile_v1");
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SajuInput>;
    return normalizeSajuInput(data);
  } catch {
    return null;
  }
}

export function isSajuInfoReady(): boolean {
  try {
    return localStorage.getItem(INFO_READY_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSajuInfoReady(): void {
  try {
    localStorage.setItem(INFO_READY_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function saveSajuInput(input: SajuInput): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...input, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

export interface SajuDailyBundle {
  dayKey: string;
  weekday: string;
  games: GeneratedNumbers[];
  input: SajuInput;
  savedAt: string;
}

/** @deprecated 주간 저장 — 일일 저장으로 대체됨 */
export interface SajuWeeklyBundle {
  weekKey: string;
  games: GeneratedNumbers[];
  input: SajuInput;
  savedAt: string;
}

export function loadDailySajuGames(date = new Date()): SajuDailyBundle | null {
  const dayKey = getSajuDayKey(date);
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SajuDailyBundle;
    if (!data?.dayKey || !Array.isArray(data.games) || data.games.length === 0) return null;
    if (data.dayKey !== dayKey) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDailySajuGames(
  games: GeneratedNumbers[],
  input: SajuInput,
  date = new Date(),
): void {
  try {
    const bundle: SajuDailyBundle = {
      dayKey: getSajuDayKey(date),
      weekday: getSajuWeekdayLabel(date),
      games,
      input,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DAILY_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export const SAJU_DAILY_GAME_COUNT = 5;
/** @deprecated SAJU_DAILY_GAME_COUNT 사용 */
export const SAJU_WEEKLY_GAME_COUNT = SAJU_DAILY_GAME_COUNT;

/** @deprecated loadDailySajuGames 사용 */
export function loadWeeklySajuGames(): SajuWeeklyBundle | null {
  try {
    const raw = localStorage.getItem(WEEKLY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SajuWeeklyBundle;
    if (!data?.weekKey || !Array.isArray(data.games) || data.games.length === 0) return null;
    if (data.weekKey !== getSajuWeekKey()) return null;
    return data;
  } catch {
    return null;
  }
}

/** @deprecated saveDailySajuGames 사용 */
export function saveWeeklySajuGames(games: GeneratedNumbers[], input: SajuInput): void {
  try {
    const bundle: SajuWeeklyBundle = {
      weekKey: getSajuWeekKey(),
      games,
      input,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export function clearDailySajuGames(): void {
  try {
    localStorage.removeItem(DAILY_KEY);
  } catch {
    /* ignore */
  }
}
