import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyFavoritePicksInvalidate } from "@/utils/favoriteNumbers";
import { notifySavedSetsInvalidate } from "@/utils/savedNumbers";

const USER_SUBCOLLECTIONS = [
  "savedNumbers",
  "favoritePicks",
  "settings",
  "fcmTokens",
  "notificationLog",
] as const;

const LOCAL_ACCOUNT_KEYS = [
  "lotto_saved_sets_v4",
  "lotto_saved_numbers",
  "lotto_saved_sets_archive_v1",
  "lotto_favorite_picks_v1",
  "lotto_migrated_firestore_v1",
  "lotto_saju_profile_v2",
  "lotto_saju_profile_v1",
  "lotto_saju_people_v1",
  "lotto_saju_daily_v1",
  "lotto_saju_daily_map_v1",
  "lotto_saju_weekly_v1",
] as const;

async function deleteAllInSubcollection(uid: string, name: string): Promise<void> {
  if (!db) return;
  const colRef = collection(db, "users", uid, name);
  const snap = await getDocs(colRef);
  if (snap.empty) return;

  let batch = writeBatch(db);
  let ops = 0;
  const commits: Promise<void>[] = [];

  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    ops += 1;
    if (ops >= 400) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) commits.push(batch.commit());
  await Promise.all(commits);
}

export async function deleteUserFirestoreData(uid: string): Promise<void> {
  if (!db) return;
  for (const name of USER_SUBCOLLECTIONS) {
    await deleteAllInSubcollection(uid, name);
  }
}

export function clearUserLocalData(): void {
  for (const key of LOCAL_ACCOUNT_KEYS) {
    localStorage.removeItem(key);
  }
  notifySavedSetsInvalidate();
  notifyFavoritePicksInvalidate();
}
