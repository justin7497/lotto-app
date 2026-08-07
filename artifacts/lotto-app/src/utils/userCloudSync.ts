import { isFirebaseConfigured } from "@/lib/firebase";
import { ensureAuthTokenReady, getAuthUserId } from "@/utils/authReady";
import { loadFavoritePicks, notifyFavoritePicksInvalidate } from "@/utils/favoriteNumbers";
import { syncPrintDoneFromCloud } from "@/utils/printDoneCloud";
import { backfillWinHistoryPrintDoneIfNeeded } from "@/utils/printDoneRestore";
import { syncSajuProfileCloud } from "@/utils/sajuProfileCloud";
import {
  loadSavedSets,
  notifySavedSetsInvalidate,
  restoreSavedSetsFromArchive,
} from "@/utils/savedNumbers";

export interface UserCloudSyncResult {
  savedCount: number;
  favoriteCount: number;
  restored: number;
  printDoneRestored: number;
  winHistoryRestored: number;
}

/** 로그인 직후: 로컬→클라우드 업로드 후 클라우드에서 다시 불러옴 */
export async function syncUserCloudData(): Promise<UserCloudSyncResult> {
  const uid = getAuthUserId();
  if (!uid || !isFirebaseConfigured) {
    return {
      savedCount: 0,
      favoriteCount: 0,
      restored: 0,
      printDoneRestored: 0,
      winHistoryRestored: 0,
    };
  }

  if (!(await ensureAuthTokenReady(true))) {
    return {
      savedCount: 0,
      favoriteCount: 0,
      restored: 0,
      printDoneRestored: 0,
      winHistoryRestored: 0,
    };
  }

  const restored = await restoreSavedSetsFromArchive();
  const saved = await loadSavedSets();
  const favorites = await loadFavoritePicks();
  const printDoneRestored = await syncPrintDoneFromCloud();
  const winHistoryRestored = await backfillWinHistoryPrintDoneIfNeeded(saved, favorites);
  await syncSajuProfileCloud(uid);
  notifySavedSetsInvalidate();
  notifyFavoritePicksInvalidate();
  return {
    savedCount: saved.length,
    favoriteCount: favorites.length,
    restored,
    printDoneRestored,
    winHistoryRestored,
  };
}
