import type { FavoritePick } from "@/utils/favoriteNumbers";
import { setFavoritePickPrintDone } from "@/utils/favoriteNumbers";
import {
  loadPrintDoneKeys,
  notifyPrintDoneInvalidate,
  printDoneKey,
  savePrintDoneKeys,
} from "@/utils/printDone";
import { schedulePrintDoneCloudSave } from "@/utils/printDoneCloud";
import {
  getRoundTag,
  setSavedSetPrintDone,
  type SavedSet,
} from "@/utils/savedNumbers";

const BACKFILL_FLAG = "lotto_win_history_backfill_v1";

function hasPlayableSavedSet(set: SavedSet): boolean {
  return set.sets.some((g) => g.numbers?.length === 6);
}

function isPastRound(roundTag: string | undefined, currentTag: string): boolean {
  return Boolean(roundTag && roundTag !== currentTag);
}

function shouldMarkSaved(
  set: SavedSet,
  keys: ReadonlySet<string>,
  currentTag: string,
  includeCurrentWeek: boolean,
): boolean {
  if (!hasPlayableSavedSet(set)) return false;
  if (keys.has(printDoneKey(set.id))) return false;
  if (set.printDone) return true;
  if (isPastRound(set.roundTag, currentTag)) return true;
  return includeCurrentWeek;
}

function shouldMarkPick(
  pick: FavoritePick,
  keys: ReadonlySet<string>,
  currentTag: string,
  includeCurrentWeek: boolean,
): boolean {
  if (pick.numbers.length !== 6) return false;
  if (keys.has(printDoneKey(pick.id))) return false;
  if (pick.printDone) return true;
  if (isPastRound(pick.roundTag, currentTag)) return true;
  return includeCurrentWeek;
}

/** 저장 세트·단골번호를 출력완료(당첨 현황)로 복구 */
export async function backfillWinHistoryPrintDone(
  saved: SavedSet[],
  picks: FavoritePick[],
  options?: { includeCurrentWeek?: boolean },
): Promise<number> {
  const keys = new Set(loadPrintDoneKeys());
  const currentTag = getRoundTag();
  const includeCurrentWeek = options?.includeCurrentWeek ?? false;
  let added = 0;

  for (const set of saved) {
    if (!shouldMarkSaved(set, keys, currentTag, includeCurrentWeek)) continue;
    keys.add(printDoneKey(set.id));
    added += 1;
    if (!set.printDone) {
      await setSavedSetPrintDone(set.id, true);
    }
  }

  for (const pick of picks) {
    if (!shouldMarkPick(pick, keys, currentTag, includeCurrentWeek)) continue;
    keys.add(printDoneKey(pick.id));
    added += 1;
    if (!pick.printDone) {
      await setFavoritePickPrintDone(pick.id, true);
    }
  }

  if (added === 0) return 0;

  savePrintDoneKeys(keys);
  schedulePrintDoneCloudSave();
  notifyPrintDoneInvalidate();
  return added;
}

/**
 * 클라우드에서 번호만 복구된 경우 1회 자동 복구.
 * 출력완료 기록이 없으면 저장된 구매 번호 전체를 당첨 현황에 반영합니다.
 */
export async function backfillWinHistoryPrintDoneIfNeeded(
  saved: SavedSet[],
  picks: FavoritePick[],
): Promise<number> {
  const hasStored =
    saved.some(hasPlayableSavedSet) || picks.some((p) => p.numbers.length === 6);
  if (!hasStored) return 0;

  const keysBefore = loadPrintDoneKeys().size;
  const alreadyBackfilled = localStorage.getItem(BACKFILL_FLAG) === "1";

  if (keysBefore === 0 && !alreadyBackfilled) {
    const added = await backfillWinHistoryPrintDone(saved, picks, { includeCurrentWeek: true });
    localStorage.setItem(BACKFILL_FLAG, "1");
    return added;
  }

  return backfillWinHistoryPrintDone(saved, picks);
}

/** 당첨 현황 화면에서 수동 복구 */
export async function restoreAllSavedToWinHistory(
  saved: SavedSet[],
  picks: FavoritePick[],
): Promise<number> {
  const added = await backfillWinHistoryPrintDone(saved, picks, { includeCurrentWeek: true });
  localStorage.setItem(BACKFILL_FLAG, "1");
  return added;
}

export function isPrintDoneForSaved(set: SavedSet, keys: ReadonlySet<string>): boolean {
  return Boolean(set.printDone) || keys.has(printDoneKey(set.id));
}

export function isPrintDoneForPick(pick: FavoritePick, keys: ReadonlySet<string>): boolean {
  return Boolean(pick.printDone) || keys.has(printDoneKey(pick.id));
}
