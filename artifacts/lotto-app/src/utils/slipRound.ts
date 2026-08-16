import type { SlipSheet } from "@/utils/slipDraft";
import { getCurrentPurchaseRoundNo } from "@/utils/savedNumbers";

/** 슬립 화면에 노출할 회차 수 (현재 + 지난 2회) */
export const SLIP_VISIBLE_ROUND_COUNT = 3;

export interface SlipRoundGroup {
  drwNo: number;
  sheets: SlipSheet[];
}

export function getSheetIssueDrwNo(sheet: SlipSheet): number | null {
  const drwNo = sheet[0]?.issueDrwNo;
  return typeof drwNo === "number" && Number.isInteger(drwNo) && drwNo > 0 ? drwNo : null;
}

export function stampSlipSheetRound(sheet: SlipSheet, drwNo: number): SlipSheet {
  return sheet.map((game) => ({ ...game, issueDrwNo: drwNo }));
}

/** 회차 미기록 슬립 — 최신 장부터 현재 회차 역순 부여 */
export function migrateLegacySheetRounds(
  sheets: SlipSheet[],
  currentRound = getCurrentPurchaseRoundNo(),
): SlipSheet[] {
  if (sheets.length === 0) return sheets;

  const next = sheets.map((sheet) => [...sheet]);
  let assignRound = currentRound;

  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (getSheetIssueDrwNo(next[i]) !== null) continue;
    next[i] = stampSlipSheetRound(next[i], assignRound);
    assignRound = Math.max(1, assignRound - 1);
  }

  return next;
}

export function groupSheetsByRound(sheets: SlipSheet[]): SlipRoundGroup[] {
  const order: number[] = [];
  const map = new Map<number, SlipSheet[]>();

  for (const sheet of sheets) {
    const drwNo = getSheetIssueDrwNo(sheet);
    if (drwNo === null) continue;
    if (!map.has(drwNo)) {
      order.push(drwNo);
      map.set(drwNo, []);
    }
    map.get(drwNo)!.push(sheet);
  }

  return order
    .sort((a, b) => b - a)
    .map((drwNo) => ({ drwNo, sheets: map.get(drwNo)! }));
}

export function getVisibleRoundNumbers(
  currentRound = getCurrentPurchaseRoundNo(),
): number[] {
  return Array.from({ length: SLIP_VISIBLE_ROUND_COUNT }, (_, i) => currentRound - i);
}

function ensureSheetRounds(
  sheets: SlipSheet[],
  currentRound: number,
): SlipSheet[] {
  return migrateLegacySheetRounds(sheets, currentRound);
}

export function filterSheetsForVisibleRounds(
  sheets: SlipSheet[],
  currentRound = getCurrentPurchaseRoundNo(),
): SlipSheet[] {
  if (sheets.length === 0) return sheets;

  const stamped = ensureSheetRounds(sheets, currentRound);
  const visible = new Set(getVisibleRoundNumbers(currentRound));
  const filtered = stamped.filter((sheet) => {
    const drwNo = getSheetIssueDrwNo(sheet);
    return drwNo !== null && visible.has(drwNo);
  });

  if (filtered.length > 0) return filtered;

  // 회차 정보가 어긋난 기존 슬립 — 최근 3개 회차 묶음만 노출
  const groups = groupSheetsByRound(stamped);
  return groups.slice(0, SLIP_VISIBLE_ROUND_COUNT).flatMap((group) => group.sheets);
}

export function groupVisibleSheetsByRound(
  sheets: SlipSheet[],
  currentRound = getCurrentPurchaseRoundNo(),
): SlipRoundGroup[] {
  return groupSheetsByRound(filterSheetsForVisibleRounds(sheets, currentRound));
}

export function isPastSlipRound(
  drwNo: number,
  currentRound = getCurrentPurchaseRoundNo(),
): boolean {
  return drwNo < currentRound;
}

export function countGamesInSheets(sheets: SlipSheet[]): number {
  return sheets.reduce((sum, sheet) => sum + sheet.length, 0);
}

export function countPrintDoneSheets(
  sheets: SlipSheet[],
  printDoneSheetIds: ReadonlySet<string>,
): number {
  return sheets.filter((sheet) => {
    const anchorId = sheet[0]?.id;
    return Boolean(anchorId && printDoneSheetIds.has(anchorId));
  }).length;
}
