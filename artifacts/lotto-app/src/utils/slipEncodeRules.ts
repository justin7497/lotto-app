/**
 * 판매점 MSG_ESLIP QR 인코딩 규칙 — 단일 정의 (v5)
 *
 * ⚠️ IMMUTABLE — `.cursor/rules/slip-qr-encode.mdc`
 * 인코딩(슬립지→QR)과 디코딩(당첨티켓 QR import)은 형식이 다릅니다.
 * - OUT: MSG_ESLIP + Q: / H:(반자동) / M:(수동 12자리)
 * - IN:  dhlottery v=...     (dhlotteryQr.ts)
 *
 * 현장: 2026-08-04 반자동 H: 가변 길이는 단말기 인식.
 * v4 M:+00 패딩은 단말기가 수동 6칸으로 읽어 「잘못된 게임 데이터」.
 *
 * 규칙을 바꿀 때: SLIP_ENCODE_VERSION 올리기 + test-qr-import.mjs + 이 파일 + docs/slip-qr-encoding.md
 */

import type { SlipPickMode } from "@/utils/mobileSlip";

/** mobileSlip.SLIP_ENCODE_VERSION 과 동기화 */
export const SLIP_ENCODE_RULE_VERSION = 5;

/** 수동 M: 번호 칸은 6슬롯×2자리 = 12자리 */
export const SLIP_PICK_DIGIT_WIDTH = 12;

/** 판매점 단말기가 이해하는 3가지 선택 */
export type SlipPickKind = "auto" | "semi" | "manual";

export interface SlipPickInput {
  numbers: number[];
  mode?: SlipPickMode;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function validatePickNumbers(nums: number[]): void {
  for (const n of nums) {
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      throw new Error(`잘못된 번호: ${n}`);
    }
  }
  if (new Set(nums).size !== nums.length) {
    throw new Error("번호가 중복되었습니다.");
  }
}

/**
 * 저장·슬립·QR 공통 — 게임 1줄이 자동/반자동/수동 중 무엇인지 판정.
 *
 * | kind   | mode | numbers | QR 토큰              | 번호 확정 |
 * |--------|------|---------|----------------------|-----------|
 * | auto   | A    | 0개     | Q:                   | 판매점 단말기 |
 * | semi   | M    | 1~5개   | H: + 고른 번호만     | 나머지는 단말기 |
 * | manual | M    | 6개     | M: + 12자리          | 앱에 저장된 값 |
 */
export function classifySlipPick(input: SlipPickInput): SlipPickKind {
  const numbers = Array.isArray(input.numbers) ? input.numbers : [];
  const mode: SlipPickMode = input.mode ?? (numbers.length === 0 ? "A" : "M");

  if (mode === "A") return "auto";
  if (numbers.length === 0) return "auto";
  if (numbers.length === 6) return "manual";
  if (numbers.length >= 1 && numbers.length <= 5) return "semi";

  throw new Error(`잘못된 슬립 선택 (mode=${mode}, 번호 ${numbers.length}개)`);
}

/** QR 인코딩 직전 — mode·번호 정규화 (자동이면 번호 제거) */
export function normalizeSlipPickForEncode(input: SlipPickInput): {
  numbers: number[];
  mode: SlipPickMode;
  kind: SlipPickKind;
} {
  const kind = classifySlipPick(input);
  if (kind === "auto") {
    return { numbers: [], mode: "A", kind };
  }
  const numbers = [...input.numbers].sort((a, b) => a - b);
  validatePickNumbers(numbers);
  return { numbers, mode: "M", kind };
}

/** 고른 번호 → 2자리씩 이어 붙임 (오름차순). 반자동은 패딩 없음 */
export function encodeSlipNumberDigits(numbers: number[]): string {
  const sorted = [...numbers].sort((a, b) => a - b);
  validatePickNumbers(sorted);
  if (sorted.length < 1 || sorted.length > 6) {
    throw new Error("수동·반자동은 번호 1~6개여야 합니다.");
  }
  return sorted.map(pad2).join("");
}

/** 숫자열 → 번호. 00은 빈 칸. 파싱 실패는 빈 배열(throw 금지 — UI에 원문 노출 방지) */
export function decodeSlipNumberDigits(digits: string): number[] {
  if (digits.length === 0 || digits.length % 2 !== 0 || digits.length > SLIP_PICK_DIGIT_WIDTH) {
    return [];
  }
  const numbers: number[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    const n = parseInt(digits.slice(i, i + 2), 10);
    if (!Number.isInteger(n) || n === 0) continue;
    if (n < 1 || n > 45) return [];
    numbers.push(n);
  }
  return numbers;
}

/** 게임 1개 → Q: / H:가변 / M:12자리. A: 금지. 반자동에 M:+00 금지 */
export function encodeSlipPickToken(kind: SlipPickKind, numbers: number[]): string {
  if (kind === "auto") return "Q:";
  const digits = encodeSlipNumberDigits(numbers);
  if (kind === "semi") {
    if (digits.length < 2 || digits.length > 10 || digits.length % 2 !== 0 || digits.includes("00")) {
      throw new Error("반자동 번호 형식이 올바르지 않습니다.");
    }
    return `H:${digits}`;
  }
  if (digits.length !== SLIP_PICK_DIGIT_WIDTH || digits.includes("00")) {
    throw new Error("수동은 번호 6개(12자리)여야 합니다.");
  }
  return `M:${digits}`;
}

/** 단말기 스캔 전 최종 검사 — 금지 토큰이 있으면 인쇄용 QR을 만들지 않음 */
export function assertTerminalSafeSlipPayload(payload: string): void {
  if (!payload.startsWith("MSG_ESLIP{")) {
    throw new Error("슬립 QR 형식이 아닙니다.");
  }
  if (/(^|,|\()A:/.test(payload)) {
    throw new Error("자동은 Q: 여야 합니다.");
  }
  const tokens = payload.match(/[MAHQ]:\d*/g) ?? [];
  if (tokens.length === 0) {
    throw new Error("게임 데이터가 없습니다.");
  }
  for (const token of tokens) {
    if (token.startsWith("A:")) {
      throw new Error("자동은 Q: 여야 합니다.");
    }
    if (token.startsWith("M:")) {
      const digits = token.slice(2);
      if (digits.length !== SLIP_PICK_DIGIT_WIDTH || digits.includes("00")) {
        throw new Error("반자동은 H: 로 넣어야 합니다.");
      }
    }
    if (token.startsWith("H:")) {
      const digits = token.slice(2);
      if (
        digits.length < 2 ||
        digits.length > 10 ||
        digits.length % 2 !== 0 ||
        digits.includes("00")
      ) {
        throw new Error("반자동 번호 형식이 올바르지 않습니다.");
      }
    }
  }
}

/** UI 라벨 */
export function slipPickKindLabel(kind: SlipPickKind): string {
  if (kind === "auto") return "자동";
  if (kind === "semi") return "반자동";
  return "수동";
}

/** 구 인코딩 감지 — 자동 A: (반자동 H: 는 v5 정상) */
export function isLegacySlipEncodeToken(payload: string): boolean {
  return /(^|,|\()A:/.test(payload);
}
