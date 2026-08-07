import { setFavoritePickPrintDone } from "@/utils/favoriteNumbers";
import { loadSavedSets, numberSetKey, setSavedSetPrintDone } from "@/utils/savedNumbers";
import { loadSlipDraft, saveSlipDraft, type SlipGame } from "@/utils/slipDraft";
import {
  loadPrintDoneKeys,
  markPrintDoneKey,
  notifyPrintDoneInvalidate,
  printDoneKey,
  savePrintDoneKeys,
} from "@/utils/printDone";

function sheetGameKeys(games: SlipGame[]): string[] {
  return games
    .filter((g) => g.numbers.length === 6)
    .map((g) => numberSetKey(g.numbers))
    .sort();
}

async function findSavedSetIdForSheet(sheetGames: SlipGame[]): Promise<string | null> {
  const linked = sheetGames.find((g) => g.savedSetId)?.savedSetId;
  if (linked) return linked;

  const pickLinked = sheetGames.find((g) => g.favoritePickId)?.favoritePickId;
  if (pickLinked) return pickLinked;

  const keys = sheetGameKeys(sheetGames);
  if (keys.length === 0) return null;

  const savedSets = await loadSavedSets();
  for (const saved of savedSets) {
    const savedKeys = saved.sets
      .filter((s) => s.numbers?.length === 6)
      .map((s) => numberSetKey(s.numbers))
      .sort();
    if (savedKeys.length === keys.length && savedKeys.every((k, i) => k === keys[i])) {
      return saved.id;
    }
  }
  return null;
}

/** 슬립지 QR에서 출력완료 → 저장된 번호에도 반영 */
export async function syncPrintDoneFromSlipSheet(sheetGames: SlipGame[]): Promise<void> {
  const setId = await findSavedSetIdForSheet(sheetGames);
  if (!setId) return;
  markPrintDoneKey(setId);
}

/** 저장된 번호에서 출력완료 → 슬립지 초안에도 반영 */
export function syncSlipPrintDoneFromSavedKey(setId: string): void {
  const draft = loadSlipDraft();
  const ids = new Set(draft.printDoneSheetIds ?? []);
  let changed = false;
  const store = draft.issuedSheets;
  const allSheets = store
    ? [...store.regular, ...store.fixed]
    : [];

  for (const sheet of allSheets) {
    const anchor = sheet[0]?.id;
    if (!anchor) continue;

    const linked = sheet.some(
      (g) => g.savedSetId === setId || g.favoritePickId === setId,
    );
    if (!linked) continue;
    if (!ids.has(anchor)) {
      ids.add(anchor);
      changed = true;
    }
  }

  if (!changed) return;
  saveSlipDraft({ ...draft, printDoneSheetIds: [...ids] });
  notifyPrintDoneInvalidate();
}

/** 번호 일치로 슬립 시트와 저장 세트 연결 (savedSetId 없을 때) */
export async function syncSlipPrintDoneFromSavedKeyByNumbers(setId: string): Promise<void> {
  const savedSets = await loadSavedSets();
  const saved = savedSets.find((s) => s.id === setId);
  if (!saved) return;

  const savedKeys = saved.sets
    .filter((s) => s.numbers?.length === 6)
    .map((s) => numberSetKey(s.numbers))
    .sort();
  if (savedKeys.length === 0) return;

  const draft = loadSlipDraft();
  const ids = new Set(draft.printDoneSheetIds ?? []);
  let changed = false;
  const store = draft.issuedSheets;
  const allSheets = store ? [...store.regular, ...store.fixed] : [];

  for (const sheet of allSheets) {
    const anchor = sheet[0]?.id;
    if (!anchor || ids.has(anchor)) continue;
    const sheetKeys = sheetGameKeys(sheet);
    if (
      sheetKeys.length === savedKeys.length &&
      sheetKeys.every((k, idx) => k === savedKeys[idx])
    ) {
      ids.add(anchor);
      changed = true;
    }
  }

  if (!changed) return;
  saveSlipDraft({ ...draft, printDoneSheetIds: [...ids] });
  notifyPrintDoneInvalidate();
}

export function markSavedAndSlipPrintDone(setId: string): void {
  markPrintDoneKey(setId);
  void setSavedSetPrintDone(setId, true);
  void setFavoritePickPrintDone(setId, true);
  syncSlipPrintDoneFromSavedKey(setId);
  void syncSlipPrintDoneFromSavedKeyByNumbers(setId);
}

export function unmarkSavedPrintDone(setId: string): void {
  const next = new Set([...loadPrintDoneKeys()].filter((k) => k !== printDoneKey(setId)));
  savePrintDoneKeys(next);
  notifyPrintDoneInvalidate();
}
