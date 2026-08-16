/** 슬립지 선택 번호 — 직접 삭제하기 전까지 유지 */



import type { SlipGameSourceId, SlipGameCategory } from "@/utils/slipGameMeta";
import { SLIP_SOURCE_LABELS, slipGameCategory } from "@/utils/slipGameMeta";
import { GAMES_PER_SLIP, type SlipPickMode } from "@/utils/mobileSlip";
import { normalizeSlipPickForEncode } from "@/utils/slipEncodeRules";
import { migrateLegacySheetRounds, stampSlipSheetRound } from "@/utils/slipRound";
import { getCurrentPurchaseRoundNo } from "@/utils/savedNumbers";
import { newSlipBatchId } from "@/utils/slipGameMeta";

export type SavedNumberSlipItem = {
  numbers: number[];
  savedSetId?: string;
  slipPickMode?: SlipPickMode;
};

function savedNumberToSlipGame(
  g: SavedNumberSlipItem,
  index: number,
  category: SlipGameCategory,
  issueBatchId?: string,
): SlipGame {
  const normalized = normalizeSlipPickForEncode({
    numbers: g.numbers,
    mode: g.slipPickMode ?? (g.numbers.length === 0 ? "A" : "M"),
  });
  return {
    id: `saved-${g.savedSetId ?? "local"}-${Date.now()}-${index}`,
    numbers: normalized.numbers,
    mode: normalized.mode,
    source: category === "fixed" ? "mypicks" : "load",
    sourceLabel: category === "fixed" ? SLIP_SOURCE_LABELS.mypicks : SLIP_SOURCE_LABELS.load,
    savedSetId: g.savedSetId,
    issueBatchId,
  };
}



const STORAGE_KEY = "lotto_slip_draft_v1";



export interface SlipGame {

  id: string;

  numbers: number[];

  mode?: "M" | "A";

  source?: SlipGameSourceId;

  sourceLabel?: string;

  batchId?: string;

  /** 추천·추출 등 저장 세트와 연결 */
  savedSetId?: string;

  /** 나의 고정번호와 연결 */
  favoritePickId?: string;

  /** 한 번에 발행한 QR 묶음 — 연속 발행 QR 인코딩용 */
  issueBatchId?: string;

  /** QR 발행 대상 회차 (구매 회차) */
  issueDrwNo?: number;

}



interface SlipDraft {

  games: SlipGame[];

  /** QR 발행 완료 슬립 (장별) */
  issuedSheets?: SlipSheetStore;

  selected: number[];

  autoSemi: boolean;

  printDoneSheetIds?: string[];

  /** 슬립지 최초 생성 시각 (ISO) */
  createdAt?: string;

  /** @deprecated 게임별 출력완료 — printDoneSheetIds로 마이그레이션 */
  printDoneIds?: string[];

}

export type SlipSheet = SlipGame[];

export interface SlipSheetStore {
  regular: SlipSheet[];
  fixed: SlipSheet[];
}

export function emptySlipSheetStore(): SlipSheetStore {
  return { regular: [], fixed: [] };
}

/**
 * 같은 issueBatchId 시트를 하나로 합침 — 연속 발행 QR(한 스캔·여러 장)용.
 * ⚠️ 불변 규칙 — `.cursor/rules/slip-continuous-qr.mdc`
 */
function mergeIssuedBatchSheets(store: SlipSheetStore): SlipSheetStore {
  const merge = (sheets: SlipSheet[]): SlipSheet[] => {
    const out: SlipSheet[] = [];
    for (let i = 0; i < sheets.length; ) {
      const batchId = sheets[i][0]?.issueBatchId;
      if (!batchId) {
        out.push(sheets[i]);
        i += 1;
        continue;
      }
      const merged = [...sheets[i]];
      i += 1;
      while (i < sheets.length && sheets[i][0]?.issueBatchId === batchId) {
        merged.push(...sheets[i]);
        i += 1;
      }
      out.push(merged);
    }
    return out;
  };
  return { regular: merge(store.regular), fixed: merge(store.fixed) };
}

function reconcilePrintDoneSheetIds(
  store: SlipSheetStore,
  printDoneIds: string[],
): string[] {
  const done = new Set(printDoneIds);
  const next: string[] = [];
  for (const sheet of [...store.regular, ...store.fixed]) {
    const anchor = sheet[0]?.id;
    if (!anchor) continue;
    if (done.has(anchor) || sheet.some((game) => done.has(game.id))) {
      next.push(anchor);
    }
  }
  return next;
}

function chunkGamesToSheets(games: SlipGame[]): SlipSheet[] {
  const sheets: SlipSheet[] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    sheets.push(games.slice(i, i + GAMES_PER_SLIP));
  }
  return sheets;
}

function isValidSheet(sheet: unknown): sheet is SlipSheet {
  return Array.isArray(sheet) && sheet.every(isValidGame);
}

function parseSheetStore(raw: unknown): SlipSheetStore {
  if (!raw || typeof raw !== "object") return emptySlipSheetStore();
  const data = raw as Partial<SlipSheetStore>;
  return {
    regular: Array.isArray(data.regular)
      ? data.regular.filter(isValidSheet)
      : [],
    fixed: Array.isArray(data.fixed) ? data.fixed.filter(isValidSheet) : [],
  };
}

function sheetsFromGames(games: SlipGame[]): SlipSheetStore {
  return {
    regular: chunkGamesToSheets(filterSlipGamesByCategory(games, "regular")),
    fixed: chunkGamesToSheets(filterSlipGamesByCategory(games, "fixed")),
  };
}

function mergeIssuedWithGames(
  issued: SlipSheetStore,
  games: SlipGame[],
): SlipSheetStore {
  const fromGames = sheetsFromGames(games);
  return {
    regular: issued.regular.length > 0 ? issued.regular : fromGames.regular,
    fixed: issued.fixed.length > 0 ? issued.fixed : fromGames.fixed,
  };
}

function migrateIssuedSheets(
  data: Partial<SlipDraft>,
  games: SlipGame[],
): SlipSheetStore {
  const base = data.issuedSheets
    ? mergeIssuedWithGames(parseSheetStore(data.issuedSheets), games)
    : sheetsFromGames(games);
  return mergeIssuedBatchSheets(base);
}

export function flattenIssuedSheets(store: SlipSheetStore): SlipGame[] {
  return [...store.regular.flat(), ...store.fixed.flat()];
}

export function getIssuedSheetsForCategory(
  store: SlipSheetStore,
  category: SlipGameCategory,
): SlipSheet[] {
  return category === "fixed" ? store.fixed : store.regular;
}

export function countIssuedGamesForCategory(
  store: SlipSheetStore,
  category: SlipGameCategory,
): number {
  return getIssuedSheetsForCategory(store, category).flat().length;
}

export function countIssuedSheetsForCategory(
  store: SlipSheetStore,
  category: SlipGameCategory,
): number {
  return getIssuedSheetsForCategory(store, category).length;
}



function migrateGameEncode(game: SlipGame): SlipGame {
  const normalized = normalizeSlipPickForEncode(game);
  return { ...game, numbers: normalized.numbers, mode: normalized.mode };
}

function migrateSheetGames(sheet: SlipSheet): SlipSheet {
  return sheet.map(migrateGameEncode);
}

function migrateSheetStoreRounds(store: SlipSheetStore): SlipSheetStore {
  const currentRound = getCurrentPurchaseRoundNo();
  return {
    regular: migrateLegacySheetRounds(store.regular, currentRound),
    fixed: migrateLegacySheetRounds(store.fixed, currentRound),
  };
}

function migrateSheetStore(store: SlipSheetStore): SlipSheetStore {
  return migrateSheetStoreRounds({
    regular: store.regular.map(migrateSheetGames),
    fixed: store.fixed.map(migrateSheetGames),
  });
}

function isValidGame(g: unknown): g is SlipGame {

  if (!g || typeof g !== "object") return false;

  const row = g as SlipGame;

  const nums = row.numbers;

  const mode = row.mode;

  if (typeof row.id !== "string" || !Array.isArray(nums)) return false;

  if (mode !== undefined && mode !== "M" && mode !== "A") return false;

  if (mode === "A") return nums.length === 0;

  if (nums.length < 1 || nums.length > 6) return false;

  if (!nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 45)) return false;

  if (row.sourceLabel !== undefined && typeof row.sourceLabel !== "string") return false;

  if (row.batchId !== undefined && typeof row.batchId !== "string") return false;

  if (row.savedSetId !== undefined && typeof row.savedSetId !== "string") return false;

  if (row.favoritePickId !== undefined && typeof row.favoritePickId !== "string") return false;

  if (row.issueBatchId !== undefined && typeof row.issueBatchId !== "string") return false;

  if (
    row.issueDrwNo !== undefined &&
    (!Number.isInteger(row.issueDrwNo) || row.issueDrwNo < 1)
  ) {
    return false;
  }

  return true;

}



function migratePrintDoneSheetIds(
  games: SlipGame[],
  data: Partial<SlipDraft>,
): string[] {
  if (Array.isArray(data.printDoneSheetIds)) {
    return data.printDoneSheetIds.filter((id): id is string => typeof id === "string");
  }

  const legacy = Array.isArray(data.printDoneIds)
    ? data.printDoneIds.filter((id): id is string => typeof id === "string")
    : [];
  if (legacy.length === 0) return [];

  const legacySet = new Set(legacy);
  const anchors: string[] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_SLIP) {
    const sheet = games.slice(i, i + GAMES_PER_SLIP);
    if (sheet.length === 0) continue;
    const anchor = sheet[0].id;
    if (legacySet.has(anchor) || sheet.every((g) => legacySet.has(g.id))) {
      anchors.push(anchor);
    }
  }
  return anchors;
}



export function loadSlipDraft(): SlipDraft {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        games: [],
        issuedSheets: emptySlipSheetStore(),
        selected: [],
        autoSemi: false,
        printDoneSheetIds: [],
        createdAt: undefined,
      };
    }

    const data = JSON.parse(raw) as Partial<SlipDraft>;

    const games = Array.isArray(data.games) ? data.games.filter(isValidGame) : [];

    const issuedSheets = migrateSheetStore(migrateIssuedSheets(data, games));

    const selected = Array.isArray(data.selected)

      ? data.selected.filter((n) => Number.isInteger(n) && n >= 1 && n <= 45).slice(0, 6)

      : [];

    const printDoneSheetIds = reconcilePrintDoneSheetIds(
      issuedSheets,
      migratePrintDoneSheetIds(flattenIssuedSheets(issuedSheets), data),
    );

    const createdAt =
      typeof data.createdAt === "string" && data.createdAt.length > 0 ? data.createdAt : undefined;

    return {

      games: flattenIssuedSheets(issuedSheets),

      issuedSheets,

      selected: issuedSheets.regular.length + issuedSheets.fixed.length > 0 ? [] : [...new Set(selected)],

      autoSemi: issuedSheets.regular.length + issuedSheets.fixed.length > 0 ? false : Boolean(data.autoSemi),

      printDoneSheetIds,

      createdAt,

    };

  } catch {

    return {
      games: [],
      issuedSheets: emptySlipSheetStore(),
      selected: [],
      autoSemi: false,
      printDoneSheetIds: [],
      createdAt: undefined,
    };

  }

}



export function saveSlipDraft(draft: SlipDraft): void {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify({

      games: draft.games,

      issuedSheets: draft.issuedSheets,

      selected: [],

      autoSemi: false,

      printDoneSheetIds: draft.printDoneSheetIds ?? [],

      createdAt: draft.createdAt,

    }),

  );

}



export function clearSlipDraft(): void {

  localStorage.removeItem(STORAGE_KEY);

}

export function filterSlipGamesByCategory(
  games: SlipGame[],
  category: SlipGameCategory,
): SlipGame[] {
  return games.filter((game) => slipGameCategory(game) === category);
}

export function countSlipGamesByCategory(
  games: SlipGame[],
  category: SlipGameCategory,
): number {
  return filterSlipGamesByCategory(games, category).length;
}

export function mergeSlipGamesByCategory(
  allGames: SlipGame[],
  category: SlipGameCategory,
  categoryGames: SlipGame[],
): SlipGame[] {
  const other = allGames.filter((game) => slipGameCategory(game) !== category);
  return [...other, ...categoryGames];
}



export function appendSlipGames(

  newGames: Array<{

    numbers: number[];

    mode?: SlipGame["mode"];

    source?: SlipGameSourceId;

    sourceLabel?: string;

    batchId?: string;

  }>,

): number {

  const draft = loadSlipDraft();

  const withIds: SlipGame[] = newGames.map((g) => ({

    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    numbers: g.numbers,

    mode: g.mode,

    source: g.source,

    sourceLabel: g.sourceLabel,

    batchId: g.batchId,

  }));

  saveSlipDraft({

    ...draft,

    games: mergeSlipGamesByCategory(draft.games, "regular", [...filterSlipGamesByCategory(draft.games, "regular"), ...withIds]),

  });

  return withIds.length;

}

export function appendSavedNumberGamesToSlip(
  items: SavedNumberSlipItem[],
  category: SlipGameCategory = "regular",
): number {
  if (items.length === 0) return 0;

  const issueBatchId = items.length > GAMES_PER_SLIP ? newSlipBatchId() : undefined;
  const draft = loadSlipDraft();
  const withIds: SlipGame[] = items.map((g, index) =>
    savedNumberToSlipGame(g, index, category, issueBatchId),
  );

  const issuedSheets = draft.issuedSheets ?? migrateIssuedSheets(draft, draft.games);
  const nextIssued: SlipSheetStore = {
    regular: [...issuedSheets.regular],
    fixed: [...issuedSheets.fixed],
  };
  // 한 번에 고른 게임은 1시트(5초과도 유지) → 한 QR 연속 발행
  nextIssued[category] = [
    ...nextIssued[category],
    stampSlipSheetRound(withIds, getCurrentPurchaseRoundNo()),
  ];

  saveSlipDraft({
    ...draft,
    games: flattenIssuedSheets(nextIssued),
    issuedSheets: nextIssued,
    selected: [],
    autoSemi: false,
    createdAt: draft.createdAt ?? new Date().toISOString(),
  });

  return withIds.length;
}

export function replaceSavedNumberGamesOnSlip(
  items: SavedNumberSlipItem[],
  category: SlipGameCategory = "regular",
): number {
  const sheetIndex = appendIssuedQrSheet(items, category);
  return sheetIndex >= 0 ? items.length : 0;
}

/** 나의 로또번호 등에서 선택한 게임을 QR 슬립 1장으로 추가 */
export function appendIssuedQrSheet(
  items: SavedNumberSlipItem[],
  category: SlipGameCategory = "regular",
): number {
  const draft = loadSlipDraft();
  if (items.length === 0) return -1;
  if (items.length > GAMES_PER_SLIP) return -1;

  const withIds: SlipGame[] = items.map((g, index) =>
    savedNumberToSlipGame(g, index, category, undefined),
  );

  const issuedSheets = draft.issuedSheets ?? migrateIssuedSheets(draft, draft.games);
  const nextIssued: SlipSheetStore = {
    regular: [...issuedSheets.regular],
    fixed: [...issuedSheets.fixed],
  };
  nextIssued[category] = [
    ...nextIssued[category],
    stampSlipSheetRound(withIds, getCurrentPurchaseRoundNo()),
  ];

  saveSlipDraft({
    ...draft,
    games: flattenIssuedSheets(nextIssued),
    issuedSheets: nextIssued,
    selected: [],
    autoSemi: false,
    createdAt: draft.createdAt ?? new Date().toISOString(),
  });

  return nextIssued[category].length - 1;
}

export function appendFavoritePicksToSlip(
  items: Array<{ numbers: number[]; mode?: SlipGame["mode"]; favoritePickId: string }>,
): number {
  const draft = loadSlipDraft();
  if (items.length === 0) return 0;

  const withIds: SlipGame[] = items.map((g, index) => ({
    id: `fav-${g.favoritePickId}-${Date.now()}-${index}`,
    numbers: [...g.numbers],
    mode: g.mode ?? (g.numbers.length === 0 ? "A" : "M"),
    source: "mypicks" as SlipGameSourceId,
    sourceLabel: SLIP_SOURCE_LABELS.mypicks,
    favoritePickId: g.favoritePickId,
  }));

  const fixedGames = [...filterSlipGamesByCategory(draft.games, "fixed"), ...withIds];
  const createdAt = draft.createdAt ?? (withIds.length > 0 ? new Date().toISOString() : undefined);

  saveSlipDraft({
    ...draft,
    games: mergeSlipGamesByCategory(draft.games, "fixed", fixedGames),
    createdAt,
  });

  return withIds.length;
}

function sameSlipNumbers(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((n, i) => n === sb[i]);
}

export type PromoteToFixedResult = "ok" | "duplicate" | "missing";

export function promoteSlipGameToFixed(
  games: SlipGame[],
  gameId: string,
): { result: PromoteToFixedResult; games: SlipGame[] } {
  const game = games.find((g) => g.id === gameId);
  if (!game || slipGameCategory(game) !== "regular") {
    return { result: "missing", games };
  }

  const fixedGames = filterSlipGamesByCategory(games, "fixed");
  if (fixedGames.some((f) => sameSlipNumbers(f.numbers, game.numbers))) {
    return { result: "duplicate", games };
  }

  const promoted: SlipGame = {
    ...game,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: "mypicks",
    sourceLabel: SLIP_SOURCE_LABELS.mypicks,
    favoritePickId: undefined,
  };

  const nextGames = mergeSlipGamesByCategory(games, "fixed", [...fixedGames, promoted]);
  return { result: "ok", games: nextGames };
}

export interface BulkPromoteToFixedResult {
  games: SlipGame[];
  promotedCount: number;
  skippedDuplicate: number;
}

export function promoteSlipGamesToFixed(
  games: SlipGame[],
  gameIds: string[],
): BulkPromoteToFixedResult {
  let next = games;
  let promotedCount = 0;
  let skippedDuplicate = 0;

  for (const id of gameIds) {
    const { result, games: updated } = promoteSlipGameToFixed(next, id);
    if (result === "ok") {
      next = updated;
      promotedCount++;
      continue;
    }
    if (result === "duplicate") {
      skippedDuplicate++;
    }
  }

  return { games: next, promotedCount, skippedDuplicate };
}

