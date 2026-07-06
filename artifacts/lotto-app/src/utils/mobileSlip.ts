/**
 * 동행복권 판매점 단말기용 모바일 슬립지(MSG_ESLIP) 인코딩.
 *
 * 실측 샘플 (로또번호 발생기 앱, 판매기 인식 확인):
 * MSG_ESLIP{10645}{(5,M:061012182327,M:101820272939,...)}{}6C|
 *
 * - 10645 : 로또 6/45 상품 코드
 * - M:     : 수동 선택 (A: 는 자동)
 * - 번호는 오름차순, 2자리 zero-pad
 * - 끝 2자리 hex = CRC-8 (poly 0x07, init 0x00), 종료 문자 |
 */

export const LOTTO_PRODUCT_CODE = "10645";
export const GAMES_PER_SLIP = 5;

export type SlipPickMode = "M" | "A";

export interface SlipGame {
  numbers: number[];
  mode?: SlipPickMode;
}

/** CRC-8 (poly 0x07, init 0x00) — 샘플 QR 체크섬과 일치 */
export function crc8(data: string): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i);
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x80) !== 0 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function encodeGame(game: SlipGame): string {
  const mode = game.mode ?? "M";
  const nums = [...game.numbers].sort((a, b) => a - b);
  if (nums.length !== 6) {
    throw new Error("각 게임은 번호 6개여야 합니다.");
  }
  for (const n of nums) {
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      throw new Error(`잘못된 번호: ${n}`);
    }
  }
  const unique = new Set(nums);
  if (unique.size !== 6) {
    throw new Error("번호가 중복되었습니다.");
  }
  return `${mode}:${nums.map(pad2).join("")}`;
}

/** 본문(체크섬·종료문자 제외) 생성 */
export function buildSlipBody(games: SlipGame[], productCode = LOTTO_PRODUCT_CODE): string {
  if (games.length === 0) throw new Error("게임이 없습니다.");
  if (games.length > GAMES_PER_SLIP) {
    throw new Error(`슬립지당 최대 ${GAMES_PER_SLIP}게임입니다.`);
  }
  const encoded = games.map(encodeGame).join(",");
  return `MSG_ESLIP{${productCode}}{(${games.length},${encoded})}{}`;
}

/** 판매점 단말기용 전체 페이로드 */
export function encodeMobileSlip(games: SlipGame[], productCode = LOTTO_PRODUCT_CODE): string {
  const body = buildSlipBody(games, productCode);
  const sum = crc8(body).toString(16).toUpperCase().padStart(2, "0");
  return `${body}${sum}|`;
}

/** 번호 배열 목록을 5게임 단위 슬립 페이로드로 분할 */
export function encodeMobileSlips(
  numberSets: number[][],
  mode: SlipPickMode = "M",
): string[] {
  const slips: string[] = [];
  for (let i = 0; i < numberSets.length; i += GAMES_PER_SLIP) {
    const chunk = numberSets.slice(i, i + GAMES_PER_SLIP).map((numbers) => ({
      numbers,
      mode,
    }));
    slips.push(encodeMobileSlip(chunk));
  }
  return slips;
}

/** 페이로드 파싱 (검증·디버그용) */
export function parseMobileSlip(payload: string): {
  productCode: string;
  games: SlipGame[];
  checksumOk: boolean;
} | null {
  const m = payload.match(
    /^MSG_ESLIP\{(\d+)\}\{\((\d+),((?:[MA]:\d{12},?)*)\)\}\{\}([0-9A-Fa-f]{2})\|$/,
  );
  if (!m) return null;
  const [, productCode, countStr, gamesRaw, checksum] = m;
  const body = payload.slice(0, -3);
  const checksumOk = crc8(body).toString(16).toUpperCase().padStart(2, "0") === checksum.toUpperCase();
  const games: SlipGame[] = [];
  const parts = gamesRaw.split(",").filter(Boolean);
  for (const part of parts) {
    const gm = part.match(/^([MA]):(\d{12})$/);
    if (!gm) return null;
    const digits = gm[2];
    const numbers: number[] = [];
    for (let i = 0; i < 12; i += 2) {
      numbers.push(parseInt(digits.slice(i, i + 2), 10));
    }
    games.push({ numbers, mode: gm[1] as SlipPickMode });
  }
  if (games.length !== Number(countStr)) return null;
  return { productCode, games, checksumOk };
}
