import type { GeneratedNumbers } from "@/data/types";
import { resolveSlipPickForEncode } from "@/utils/slipPickResolve";
import {
  emptySlipSheetStore,
  flattenIssuedSheets,
  loadSlipDraft,
  saveSlipDraft,
  type SlipGame,
  type SlipSheet,
} from "@/utils/slipDraft";
import { GAMES_PER_SLIP } from "@/utils/mobileSlip";
import { getCurrentPurchaseRoundNo } from "@/utils/savedNumbers";
import { stampSlipSheetRound } from "@/utils/slipRound";
import {
  newSlipBatchId,
  slipSourceLabel,
  type SlipGameSourceId,
} from "@/utils/slipGameMeta";

function newSlipGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function stampGamesAsIssuedSheets(games: SlipGame[]): SlipSheet[] {
  const drwNo = getCurrentPurchaseRoundNo();
  // 한 번에 보낸 번호는 1시트 유지 → 5초과 시 한 QR 연속 발행
  const issueBatchId = games.length > GAMES_PER_SLIP ? newSlipBatchId() : undefined;
  const withBatch = issueBatchId
    ? games.map((g) => ({ ...g, issueBatchId }))
    : games;
  return [stampSlipSheetRound(withBatch, drwNo)];
}

export type SendToSlipResult =
  | { ok: true; count: number; sourceLabel: string }
  | { ok: false; error: string };

export interface SendToSlipOptions {
  source: SlipGameSourceId;
  sourceLabel?: string;
  /** false면 기존 슬립에 이어 붙임 (기본: 교체) */
  replace?: boolean;
  /** 저장 세트 ID — 출력완료 연동용 */
  savedSetId?: string;
  favoritePickId?: string;
}

/** 추천·생성 번호 → 일반번호 슬립지 QR */
export function sendGeneratedToSlip(
  results: GeneratedNumbers[],
  options: SendToSlipOptions,
): SendToSlipResult {
  const label = slipSourceLabel(options.source, options.sourceLabel);
  if (!label) {
    return { ok: false, error: "출처 정보가 없습니다." };
  }

  const batchId = newSlipBatchId();
  const incoming: SlipGame[] = [];

  for (const row of results) {
    if (!row.numbers || row.numbers.length !== 6) continue;
    incoming.push({
      id: newSlipGameId(),
      numbers: [...row.numbers].sort((a, b) => a - b),
      mode: "M",
      source: options.source,
      sourceLabel: label,
      batchId,
      savedSetId: options.savedSetId,
    });
  }

  if (incoming.length === 0) {
    return { ok: false, error: "슬립지에 넣을 6개 번호가 없습니다." };
  }

  const draft = loadSlipDraft();
  const prevIssued = draft.issuedSheets ?? emptySlipSheetStore();
  const stampedSheets = stampGamesAsIssuedSheets(incoming);
  const nextRegular =
    options.replace === false ? [...prevIssued.regular, ...stampedSheets] : stampedSheets;
  const nextIssued = { ...prevIssued, regular: nextRegular };
  const keepCreatedAt =
    options.replace === false && draft.games.length > 0 && draft.createdAt;

  saveSlipDraft({
    games: flattenIssuedSheets(nextIssued),
    issuedSheets: nextIssued,
    selected: [],
    autoSemi: draft.autoSemi,
    printDoneSheetIds: draft.printDoneSheetIds,
    createdAt: keepCreatedAt ? draft.createdAt : new Date().toISOString(),
  });

  return { ok: true, count: incoming.length, sourceLabel: label };
}

/** 고정번호 → 고정번호 슬립지 QR */
export function sendPickToSlip(
  pick: { numbers: number[]; autoSemi: boolean },
  options: SendToSlipOptions,
): SendToSlipResult {
  const label = slipSourceLabel(options.source, options.sourceLabel);
  if (!label) {
    return { ok: false, error: "출처 정보가 없습니다." };
  }

  const nums = [...pick.numbers].sort((a, b) => a - b);
  if (nums.length === 0) {
    if (!pick.autoSemi) {
      return { ok: false, error: "번호를 선택하거나 자동/반자동을 켜 주세요." };
    }
  } else if (nums.length < 6 && !pick.autoSemi) {
    return { ok: false, error: "번호 6개를 선택하거나 자동/반자동을 켜 주세요." };
  }

  const { numbers, mode } = resolveSlipPickForEncode(nums, { autoSemi: pick.autoSemi });
  const game: SlipGame = {
    id: newSlipGameId(),
    numbers,
    mode,
    source: options.source,
    sourceLabel: label,
    batchId: newSlipBatchId(),
    favoritePickId: options.favoritePickId,
    savedSetId: options.savedSetId,
  };

  const draft = loadSlipDraft();
  const prevIssued = draft.issuedSheets ?? emptySlipSheetStore();
  const stampedSheets = stampGamesAsIssuedSheets([game]);
  const nextFixed =
    options.replace === false ? [...prevIssued.fixed, ...stampedSheets] : stampedSheets;
  const nextIssued = { ...prevIssued, fixed: nextFixed };
  const keepCreatedAt =
    options.replace === false && draft.games.length > 0 && draft.createdAt;

  saveSlipDraft({
    games: flattenIssuedSheets(nextIssued),
    issuedSheets: nextIssued,
    selected: [],
    autoSemi: draft.autoSemi,
    printDoneSheetIds: draft.printDoneSheetIds,
    createdAt: keepCreatedAt ? draft.createdAt : new Date().toISOString(),
  });

  return { ok: true, count: 1, sourceLabel: label };
}

/** 일반번호 슬립지 QR (추천·생성 번호 연동) */
export const SLIP_QR_PATH = "/slip?qr=1&tab=regular";
/** 고정번호 슬립지 QR */
export const SLIP_FIXED_QR_PATH = "/slip?qr=1&tab=fixed";
