import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  minRank: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: false,
  pushEnabled: false,
  minRank: 5,
  updatedAt: new Date().toISOString(),
};

const SETTINGS_DOC_ID = "notifications";

function settingsRef(uid: string) {
  if (!db) throw new Error("Firestore is not configured");
  return doc(db, "users", uid, "settings", SETTINGS_DOC_ID);
}

function normalizeSettings(raw: unknown): NotificationSettings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const minRank = data.minRank;
  const rank =
    typeof minRank === "number" && minRank >= 1 && minRank <= 5
      ? (minRank as NotificationSettings["minRank"])
      : DEFAULT_NOTIFICATION_SETTINGS.minRank;

  return {
    emailEnabled: Boolean(data.emailEnabled),
    pushEnabled: Boolean(data.pushEnabled),
    minRank: rank,
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

export async function loadNotificationSettings(
  uid: string,
): Promise<NotificationSettings> {
  if (!isFirebaseConfigured || !db) return DEFAULT_NOTIFICATION_SETTINGS;
  const snap = await getDoc(settingsRef(uid));
  if (!snap.exists()) return DEFAULT_NOTIFICATION_SETTINGS;
  return normalizeSettings(snap.data());
}

export async function saveNotificationSettings(
  uid: string,
  partial: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase가 설정되지 않았습니다");
  }
  const current = await loadNotificationSettings(uid);
  const next: NotificationSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(settingsRef(uid), next);
  return next;
}
