/**
 * 동행복권 판매점 단말기용 모바일 슬립지(MSG_ESLIP) 인코딩.
 *
 * 실측 샘플 (로또번호 발생기 앱, 판매기 인식 확인):
 * MSG_ESLIP{10645}{(5,M:061012182327,M:101820272939,...)}{}6C|
 *
 * 복수 슬립(10게임=2장, 20게임=4장)은 블록을 이어 붙임:
 * MSG_ESLIP{10645}{(5,...)(5,...)}{}XX|
 *
 * - 10645 : 로또 6/45 상품 코드
 * - M:     : 수동 6개 (12자리)
 * - H:     : 반자동 (고른 번호만 2자리씩, 예: 13,18 → H:1318)
 * - A:     : 자동
 * - 번호는 오름차순, 2자리 zero-pad
 * - 끝 2자리 hex = CRC-8 (poly 0x07, init 0x00), 종료 문자 |
 */

export const LOTTO_PRODUCT_CODE = "10645";
/** 실물 슬립지 1장(A~E)당 게임 수 */
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

function validateNumbers(nums: number[]): void {
  for (const n of nums) {
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      throw new Error(`잘못된 번호: ${n}`);
    }
  }
  if (new Set(nums).size !== nums.length) {
    throw new Error("번호가 중복되었습니다.");
  }
}

function encodeGame(game: SlipGame): string {
  const nums = [...game.numbers].sort((a, b) => a - b);
  const mode = game.mode ?? (nums.length === 0 ? "A" : "M");

  if (mode === "A" || nums.length === 0) {
    return "A:";
  }

  if (nums.length === 6) {
    validateNumbers(nums);
    return `M:${nums.map(pad2).join("")}`;
  }

  if (nums.length >= 1 && nums.length <= 5) {
    validateNumbers(nums);
    return `H:${nums.map(pad2).join("")}`;
  }

  throw new Error("수동·반자동은 번호 1~6개여야 합니다.");
}

function encodeSlipBlock(games: SlipGame[]): string {
  if (games.length === 0) throw new Error("게임이 없습니다.");
  if (games.length > GAMES_PER_SLIP) {
    throw new Error(`슬립지당 최대 ${GAMES_PER_SLIP}게임입니다.`);
  }
  const encoded = games.map(encodeGame).join(",");
  return `(${games.length},${encoded})`;
}

function parseGamesRaw(gamesRaw: string): SlipGame[] {
  const games: SlipGame[] = [];
  const parts = gamesRaw.split(",").filter(Boolean);
  for (const part of parts) {
    const gm = part.match(/^([MAH]):(\d*)$/);
    if (!gm) throw new Error("잘못된 게임 데이터");
    const pick = gm[1];
    const digits = gm[2];
    if (pick === "A") {
      games.push({ numbers: [], mode: "A" });
      continue;
    }
    if (digits.length === 0 || digits.length % 2 !== 0 || digits.length > 12) {
      throw new Error("잘못된 게임 데이터");
    }
    const numbers: number[] = [];
    for (let i = 0; i < digits.length; i += 2) {
      numbers.push(parseInt(digits.slice(i, i + 2), 10));
    }
    games.push({ numbers, mode: "M" });
  }
  return games;
}

/** 본문(체크섬·종료문자 제외) — 슬립 1장 분량 */
export function buildSlipBody(games: SlipGame[], productCode = LOTTO_PRODUCT_CODE): string {
  return `MSG_ESLIP{${productCode}}{${encodeSlipBlock(games)}}{}`;
}

/** 본문(체크섬·종료문자 제외) — 복수 슬립을 한 QR에 연결 */
export function buildMultiSlipBody(
  games: SlipGame[],
  productCode = LOTTO_PRODUCT_CODE,
): string {
  if (games.length === 0) throw new Error("게임이 없습니다.");
  let blocks = "";
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    blocks += encodeSlipBlock(games.slice(i, i + GAMES_PER_SLIP));
  }
  return `MSG_ESLIP{${productCode}}{${blocks}}{}`;
}

/** 번호 배열만 있을 때 SlipGame으로 변환 (기존 호출 호환) */
export function numberSetsToGames(
  numberSets: number[][],
  mode: SlipPickMode = "M",
): SlipGame[] {
  return numberSets.map((numbers) => ({ numbers, mode }));
}

/** 판매점 단말기용 전체 페이로드 — 슬립 1장 */
export function encodeMobileSlip(games: SlipGame[], productCode = LOTTO_PRODUCT_CODE): string {
  const body = buildSlipBody(games, productCode);
  const sum = crc8(body).toString(16).toUpperCase().padStart(2, "0");
  return `${body}${sum}|`;
}

/** 판매점 단말기용 전체 페이로드 — 모든 게임을 한 QR에 (5게임 단위 블록 연결) */
export function encodeMobileSlipPayload(games: SlipGame[]): string {
  const body = buildMultiSlipBody(games);
  const sum = crc8(body).toString(16).toUpperCase().padStart(2, "0");
  return `${body}${sum}|`;
}

function isNumberMatrix(value: SlipGame[] | number[][]): value is number[][] {
  return value.length > 0 && Array.isArray(value[0]);
}

/** 번호 목록 → 슬립 1장(5게임)당 QR 페이로드 1개 */
export function encodeMobileSlips(
  gamesOrSets: SlipGame[] | number[][],
  mode: SlipPickMode = "M",
): string[] {
  const games = isNumberMatrix(gamesOrSets)
    ? numberSetsToGames(gamesOrSets, mode)
    : gamesOrSets;
  if (games.length === 0) return [];

  const payloads: string[] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    payloads.push(encodeMobileSlip(games.slice(i, i + GAMES_PER_SLIP)));
  }
  return payloads;
}

export function slipGameLabel(game: SlipGame): string {
  if (game.mode === "A" || game.numbers.length === 0) return "자동";
  if (game.numbers.length < 6) return "반자동";
  return "수동";
}

/** 페이로드 파싱 (검증·디버그용) */
export function parseMobileSlip(payload: string): {
  productCode: string;
  games: SlipGame[];
  slipCount: number;
  checksumOk: boolean;
} | null {
  const m = payload.match(
    /^MSG_ESLIP\{(\d+)\}\{((?:\(\d+,(?:[MAH]:\d{0,12},?)*\))+)\}\{\}([0-9A-Fa-f]{2})\|$/,
  );
  if (!m) return null;
  const [, productCode, blocksRaw, checksum] = m;
  const body = payload.slice(0, -3);
  const checksumOk =
    crc8(body).toString(16).toUpperCase().padStart(2, "0") === checksum.toUpperCase();

  const games: SlipGame[] = [];
  let slipCount = 0;
  const blockRe = /\((\d+),((?:[MAH]:\d{0,12},?)*)\)/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(blocksRaw)) !== null) {
    slipCount += 1;
    const count = Number(block[1]);
    const parsed = parseGamesRaw(block[2]);
    if (parsed.length !== count) return null;
    games.push(...parsed);
  }
  if (slipCount === 0) return null;
  return { productCode, games, slipCount, checksumOk };
}
