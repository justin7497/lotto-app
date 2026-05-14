/**
 * printCalibration.ts — 실물 슬립지 인쇄 캘리브레이션
 *
 * 슬립지 규격  : 190mm × 83mm (가로/Landscape)
 * 번호 배열   : 7열 × 7행 = 49칸 (마지막 4칸 빈칸, 번호 1~45)
 *               행1: 1~7 / 행2: 8~14 / 행3: 15~21 / 행4: 22~28
 *               행5: 29~35 / 행6: 36~42 / 행7: 43~45 (빈 4칸)
 * 게임 A~E   : 가로 방향(왼→오른)으로 배열
 *
 * 좌표 공식:
 *   col = (num-1) % 7,  row = floor((num-1) / 7)
 *   X = startX + gameIdx × gamePitch + col × colPitch
 *   Y = startY + row × rowPitch
 *
 * startX : 슬립 왼쪽 끝 → A게임 1번 마킹 중심까지 거리 (실측값 7mm)
 * startY : 슬립 위쪽 끝 → 1번 행 마킹 중심까지 거리  (실측값 41mm)
 */

// ─── 슬립지 물리 상수 (고정값) ─────────────────────────────────────
export const SLIP_W    = 190.0; // mm — 슬립지 폭 (가로/landscape)
export const SLIP_H    = 83.0;  // mm — 슬립지 높이 (landscape)

export const COLS      = 7;     // 열 수 (가로, 1~7, 8~14, …)
export const ROWS      = 7;     // 행 수 (세로, 행7 마지막 4칸은 빈칸)
export const COL_PITCH = 3.5;   // mm — 열 간격 (실측: 1번↔2번 중심)
export const ROW_PITCH = 6.5;   // mm — 행 간격 (실측: 1번↔8번 중심)

// 마킹 타원 크기
export const MARK_W    = 2.5;   // mm — 타원 폭
export const MARK_H    = 4.5;   // mm — 타원 높이

// 게임 간격 기본값 (실측: A칸1번↔B칸1번 중심)
export const DEFAULT_GAME_PITCH = 17.0; // mm

// ─── 캘리브레이션 인터페이스 ────────────────────────────────────────
export interface PrintCalibration {
  startX:    number;  // mm — 슬립 왼쪽 끝 → A게임 1번 마킹 중심 (실측해서 입력)
  startY:    number;  // mm — 슬립 위쪽 끝 → 1번행 마킹 중심 (실측해서 입력)
  gamePitch: number;  // mm — 게임 간 가로 간격 (A→B 중심거리)
  colPitch:  number;  // mm — 번호 열 간격
  rowPitch:  number;  // mm — 번호 행 간격
}

export const DEFAULT_CAL: PrintCalibration = {
  startX:    7.0,
  startY:    41.0,
  gamePitch: DEFAULT_GAME_PITCH,
  colPitch:  COL_PITCH,
  rowPitch:  ROW_PITCH,
};

const LS_KEY = "lotto_print_cal_v14";

export function loadCalibration(): PrintCalibration {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_CAL, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_CAL };
}

export function saveCalibration(cal: PrintCalibration) {
  localStorage.setItem(LS_KEY, JSON.stringify(cal));
}

export function resetCalibration(): PrintCalibration {
  localStorage.removeItem(LS_KEY);
  return { ...DEFAULT_CAL };
}

// ─── 좌표 계산 ──────────────────────────────────────────────────────
/**
 * 인쇄용 마크 중심 좌표 (mm, Landscape 기준)
 *
 *   X = startX + gameIdx × gamePitch + col × colPitch
 *   Y = startY + row × rowPitch
 */
export function cellMm(
  num: number,
  gameIdx: number,
  cal: PrintCalibration,
): { x: number; y: number } {
  const col = (num - 1) % COLS;
  const row = Math.floor((num - 1) / COLS);
  return {
    x: cal.startX + gameIdx * cal.gamePitch + col * cal.colPitch,
    y: cal.startY + row * cal.rowPitch,
  };
}

// ─── Legacy aliases ──────────────────────────────────────────────────
export type PrintOffset = PrintCalibration;
export const DEFAULT_OFFSET = DEFAULT_CAL;
export function loadOffset() { return loadCalibration(); }
export function saveOffset(o: PrintCalibration) { saveCalibration(o); }
export function resetOffset() { return resetCalibration(); }
