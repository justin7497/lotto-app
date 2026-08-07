import type { GeneratedNumbers } from "@/data/types";
import type { SlipGame, SlipPickMode } from "@/utils/mobileSlip";
import { parseMobileSlip } from "@/utils/mobileSlip";
import {
  extractDhlotteryV,
  parseDhlotteryWinV,
} from "@/utils/dhlotteryQr";
import { getRoundTag, saveNumberSets } from "@/utils/savedNumbers";
import { appendSlipGames } from "@/utils/slipDraft";

export interface ImportGame {
  numbers: number[];
  mode: SlipPickMode;
  label?: string;
}

export type ImportQrResult =
  | {
      ok: true;
      source: "ticket" | "eslip";
      roundNo?: number;
      roundTag: string;
      games: ImportGame[];
    }
  | { ok: false; message: string };

function toImportGame(
  numbers: number[],
  mode?: SlipPickMode,
  label?: string,
): ImportGame {
  const pickMode = mode ?? (numbers.length === 0 ? "A" : "M");
  return {
    numbers: pickMode === "A" ? [] : [...numbers].sort((a, b) => a - b),
    mode: pickMode,
    label,
  };
}

function normalizeImportQrRaw(raw: string): string {
  let text = raw.replace(/^\uFEFF/, "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  const eslipMatch = text.match(/MSG_ESLIP\{[\s\S]+/);
  if (eslipMatch) {
    text = eslipMatch[0].replace(/\s+/g, "");
    if (!text.endsWith("|")) {
      const bodyMatch = text.match(/^(MSG_ESLIP\{.+?\}\{\})/);
      if (bodyMatch) {
        const checksumMatch = text.slice(bodyMatch[1].length).match(/^([0-9A-Fa-f]{2})/);
        text = checksumMatch ? `${bodyMatch[1]}${checksumMatch[1]}|` : text;
      }
    }
  }

  return text;
}

export function looksLikeImportQr(raw: string): boolean {
  const text = raw.trim();
  return (
    text.startsWith("MSG_ESLIP") ||
    /dhlottery/i.test(text) ||
    /[?&#]v=/i.test(text) ||
    /^\d+[mqs]/i.test(text)
  );
}

export function filterActiveImportGames(games: ImportGame[]): ImportGame[] {
  return games.filter((g) => g.mode === "A" || g.numbers.length > 0);
}

/** 발행 티켓 QR · 모바일 슬립 QR → 게임 목록 */
export function parseImportQr(raw: string): ImportQrResult {
  const text = normalizeImportQrRaw(raw);
  if (!text) {
    return { ok: false, message: "QR 내용이 비어 있습니다." };
  }

  const eslip = parseMobileSlip(text);
  if (eslip) {
    return {
      ok: true,
      source: "eslip",
      roundTag: getRoundTag(),
      games: eslip.games.map((g, i) =>
        toImportGame(g.numbers, g.mode, `${String.fromCharCode(65 + i)}게임`),
      ),
    };
  }

  const v = extractDhlotteryV(text);
  if (v) {
    const data = parseDhlotteryWinV(v);
    if (!data) {
      return { ok: false, message: "티켓 QR 형식을 읽을 수 없습니다." };
    }
    return {
      ok: true,
      source: "ticket",
      roundNo: data.roundNo,
      roundTag: `제${data.roundNo}회`,
      games: data.games.map((nums, i) =>
        toImportGame(nums, nums.length === 0 ? "A" : "M", `${String.fromCharCode(65 + i)}게임`),
      ),
    };
  }

  return {
    ok: false,
    message:
      "인식할 수 없는 QR입니다. 발행된 복권 QR 또는 모바일 슬립 QR을 다시 맞춰 주세요.",
  };
}

function importGamesToGenerated(games: ImportGame[]): GeneratedNumbers[] {
  return filterActiveImportGames(games).map((g, index) => ({
    numbers: (g.mode === "A" ? [] : g.numbers) as GeneratedNumbers["numbers"],
    mode: "random",
    slipPickMode: g.mode,
    summary: g.label ?? `${String.fromCharCode(65 + index)}게임`,
  }));
}

export async function saveImportedToMyNumbers(
  games: ImportGame[],
  roundTag?: string,
): Promise<{ saved: number; error?: string }> {
  const generated = importGamesToGenerated(games);
  if (generated.length === 0) {
    return { saved: 0, error: "저장할 번호가 없습니다." };
  }

  const tag = roundTag ?? getRoundTag();
  const sourceLabel =
    roundTag && /^제\d+회$/.test(roundTag) ? `발행 티켓 QR · ${roundTag}` : "발행 티켓 QR";
  const result = await saveNumberSets(generated, sourceLabel, tag);
  if (!result.ok) {
    return { saved: 0, error: result.error };
  }
  return { saved: result.set.sets.length };
}

export function importGamesToSlipDraft(games: ImportGame[]): number {
  const slipGames: Omit<SlipGame, "id">[] = filterActiveImportGames(games).map((g) => ({
    numbers: g.numbers,
    mode: g.mode,
  }));
  if (slipGames.length === 0) return 0;
  return appendSlipGames(slipGames);
}
