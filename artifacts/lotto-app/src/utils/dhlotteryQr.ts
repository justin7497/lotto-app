import { parseMobileSlip } from "@/utils/mobileSlip";

export type QrScanKind = "win" | "eslip" | "unknown";

export type DhlotteryPickKind = "manual" | "semi" | "auto";

export interface DhlotteryWinQr {
  roundNo: number;
  games: number[][];
  /** 게임별 수동/반자동 (m=수동, q/s=반자동) */
  kinds: DhlotteryPickKind[];
}

/** 스캔 문자열 종류 판별 */
export function classifyQrScan(raw: string): QrScanKind {
  const text = raw.trim();
  if (text.startsWith("MSG_ESLIP")) return "eslip";
  if (extractDhlotteryV(text)) return "win";
  return "unknown";
}

function decodeVParam(value: string): string {
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

/** 당첨 확인용 QR에서 v 파라미터 추출 */
export function extractDhlotteryV(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.startsWith("MSG_ESLIP")) return null;

  try {
    const url = new URL(text);
    const fromSearch = url.searchParams.get("v");
    if (fromSearch) return decodeVParam(fromSearch);

    const hashMatch = url.hash.match(/[?&]v=([^&\s#]+)/i);
    if (hashMatch?.[1]) return decodeVParam(hashMatch[1]);
  } catch {
    /* not a URL */
  }

  const inlineMatch = text.match(/[?&#]v=([^&\s#]+)/i);
  if (inlineMatch?.[1]) {
    return decodeVParam(inlineMatch[1]);
  }

  const splitMatch = text.split(/[?&]v=/i);
  if (splitMatch.length === 2 && splitMatch[1]) {
    const v = splitMatch[1].split(/[&#\s]/)[0];
    if (v) return decodeVParam(v);
  }

  if (/^\d+[mqs]/i.test(text)) {
    return text;
  }

  return null;
}

/** 마지막 n+숫자 체크섬·메타 제거 */
function stripWinVTrailer(v: string): string {
  return v.trim().replace(/n\d+$/i, "");
}

function delimiterToKind(delim: string): DhlotteryPickKind {
  const d = delim.toLowerCase();
  if (d === "m") return "manual";
  if (d === "q" || d === "s") return "semi";
  return "manual";
}

function parseNumberChunk(chunk: string): number[] | null {
  if (!chunk || chunk.length % 2 !== 0) return null;
  const numbers: number[] = [];
  for (let i = 0; i < chunk.length; i += 2) {
    const n = parseInt(chunk.slice(i, i + 2), 10);
    if (!Number.isInteger(n) || n < 1 || n > 45) return null;
    numbers.push(n);
  }
  if (numbers.length > 6) return null;
  if (new Set(numbers).size !== numbers.length) return null;
  return numbers;
}

/** 12자리 중 00 은 빈 칸(반자동 나머지 자동) */
function parsePaddedNumberChunk(digits: string): number[] | null {
  const numbers: number[] = [];
  for (let i = 0; i < 12; i += 2) {
    const pair = digits.slice(i, i + 2);
    if (pair === "00") continue;
    const n = parseInt(pair, 10);
    if (!Number.isInteger(n) || n < 1 || n > 45) return null;
    numbers.push(n);
  }
  if (numbers.length > 6) return null;
  if (new Set(numbers).size !== numbers.length) return null;
  return numbers;
}

/** NN + 고른번호 + 00패딩 (예: 021318000000 → 13,18) */
function parsePickCountPaddedChunk(digits: string): number[] | null {
  const pickCount = parseInt(digits.slice(0, 2), 10);
  if (pickCount < 1 || pickCount > 5) return null;
  const numsPart = digits.slice(2, 2 + pickCount * 2);
  const rest = digits.slice(2 + pickCount * 2);
  if (!/^0+$/.test(rest)) return null;
  const picked = parseNumberChunk(numsPart);
  if (!picked || picked.length !== pickCount) return null;
  return picked;
}

/** 12자리 게임 블록 — 00 패딩 반자동 우선, 없으면 null(수동 6개로 폴백) */
function parseTwelveDigitChunk(digits: string): number[] | null {
  if (/^0+$/.test(digits)) return [];

  const pickPadded = parsePickCountPaddedChunk(digits);
  if (pickPadded) return pickPadded;

  if (/00/.test(digits)) {
    const padded = parsePaddedNumberChunk(digits);
    if (padded && padded.length >= 1 && padded.length <= 6) return padded;
    return null;
  }

  return null;
}

function parseGameChunk(chunk: string): number[] | null {
  const trimmed = chunk.trim();
  if (!trimmed) return [];
  if (/^0+$/.test(trimmed)) return [];

  // 반자동: h/s 접두 제거 후 본문 파싱 (q/h021318 → 02+1318)
  const body = trimmed.replace(/^[hs]/i, "");
  let digits = body.replace(/\D/g, "");
  if (!digits) return [];

  // 02 + 번호 — h/s 제거 뒤 먼저 적용
  if (digits.length >= 4) {
    const pickCount = parseInt(digits.slice(0, 2), 10);
    const rest = digits.slice(2);
    if (pickCount >= 1 && pickCount <= 5 && rest.length === pickCount * 2) {
      const picked = parseNumberChunk(rest);
      if (picked) return picked;
    }
  }

  if (digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  if (digits.length === 12) {
    const padded = parseTwelveDigitChunk(digits);
    if (padded !== null) return padded;
    return parseNumberChunk(digits);
  }

  if (digits.length >= 2 && digits.length <= 10 && digits.length % 2 === 0) {
    return parseNumberChunk(digits);
  }

  return null;
}

function parseWinVGames(v: string): {
  roundNo: number;
  chunks: string[];
  kinds: DhlotteryPickKind[];
} | null {
  const normalized = stripWinVTrailer(v);
  const roundMatch = normalized.match(/^(\d+)/);
  if (!roundMatch) return null;

  const roundNo = parseInt(roundMatch[1], 10);
  if (!Number.isFinite(roundNo) || roundNo < 1) return null;

  const body = normalized.slice(roundMatch[1].length);
  const chunks: string[] = [];
  const kinds: DhlotteryPickKind[] = [];
  const re = /([mqs])([^mqsn]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    kinds.push(delimiterToKind(match[1]));
    chunks.push(match[2]);
  }

  if (chunks.length === 0) return null;
  return { roundNo, chunks, kinds };
}

/** 동행복권 당첨 QR v 값 파싱 (회차 + 게임별 번호) */
export function parseDhlotteryWinV(v: string): DhlotteryWinQr | null {
  const parsed = parseWinVGames(v);
  if (!parsed) return null;

  const games: number[][] = [];
  const kinds: DhlotteryPickKind[] = [];

  for (let i = 0; i < parsed.chunks.length; i++) {
    const numbers = parseGameChunk(parsed.chunks[i]);
    if (numbers === null) continue;
    games.push(numbers);
    kinds.push(
      numbers.length === 0 ? "auto" : parsed.kinds[i] ?? "manual",
    );
  }

  if (games.length === 0) return null;
  return { roundNo: parsed.roundNo, games, kinds };
}

export type QrWinParseResult =
  | { ok: true; data: DhlotteryWinQr }
  | { ok: false; kind: QrScanKind; message: string };

/** 카메라·수동 입력 공통 파서 */
export function parseQrWinScan(raw: string): QrWinParseResult {
  const kind = classifyQrScan(raw);
  if (kind === "eslip") {
    const slip = parseMobileSlip(raw.trim());
    if (slip) {
      return {
        ok: false,
        kind: "eslip",
        message:
          "판매점 구매용 QR입니다. 당첨 확인은 구매 후 복권에 인쇄된 QR을 스캔해 주세요.",
      };
    }
  }

  const v = extractDhlotteryV(raw);
  if (!v) {
    return {
      ok: false,
      kind: "unknown",
      message: "로또 당첨 확인 QR을 인식하지 못했습니다. 복권 우측 QR을 다시 맞춰 주세요.",
    };
  }

  const data = parseDhlotteryWinV(v);
  if (!data) {
    return {
      ok: false,
      kind: "unknown",
      message: "QR 형식을 읽을 수 없습니다. 빛 반사가 없는 곳에서 다시 시도해 주세요.",
    };
  }

  return { ok: true, data };
}
