import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { getApps } from "firebase/app";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { setDeviceEngagementEnabled } from "@/utils/deviceEngagement";
import {
  deleteNativePushToken,
  fetchNativePushToken,
  isNativePushBridgeAvailable,
} from "@/utils/nativePushBridge";

const SW_PATH = "/firebase-messaging-sw.js";

function getVapidKey(): string | null {
  const key = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  return key?.trim() || null;
}

export function hashToken(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h << 5) - h + token.charCodeAt(i);
    h |= 0;
  }
  return `t${Math.abs(h)}`;
}

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseConfigured) return null;
  if (!(await isSupported())) return null;
  if (messagingInstance) return messagingInstance;

  const apps = getApps();
  const app = apps[0];
  if (!app) return null;

  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH);
  } catch {
    return null;
  }
}

export async function isPushSupported(): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  if (isNativePushBridgeAvailable()) return true;
  return (await isSupported()) && Boolean(getVapidKey());
}

async function registerNativeDeviceEngagementPush(): Promise<string | null> {
  const result = await fetchNativePushToken();
  if (!result.ok || !result.token) return null;

  const deviceId = getOrCreateDeviceId();
  await setDeviceEngagementEnabled(deviceId, true, result.token, false);
  return result.token;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

export async function fetchFcmToken(): Promise<string | null> {
  const vapidKey = getVapidKey();
  if (!vapidKey || !db) return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await ensureServiceWorker();
  if (!registration) return null;

  try {
    return await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch {
    return null;
  }
}

export async function registerPushToken(uid: string): Promise<string | null> {
  if (!db) return null;

  let token: string | null = null;
  if (isNativePushBridgeAvailable()) {
    const result = await fetchNativePushToken();
    token = result.ok && result.token ? result.token : null;
  } else {
    const permission = await requestPushPermission();
    if (permission !== "granted") return null;
    token = await fetchFcmToken();
  }
  if (!token) return null;

  await setDoc(doc(db, "users", uid, "fcmTokens", hashToken(token)), {
    token,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent.slice(0, 200),
  });

  return token;
}

export async function registerDeviceEngagementPush(): Promise<string | null> {
  if (isNativePushBridgeAvailable()) {
    return registerNativeDeviceEngagementPush();
  }

  const permission = await requestPushPermission();
  if (permission !== "granted") return null;

  const token = await fetchFcmToken();
  if (!token) return null;

  const deviceId = getOrCreateDeviceId();
  await setDeviceEngagementEnabled(deviceId, true, token, false);
  return token;
}

export async function unregisterDeviceEngagementPush(): Promise<void> {
  if (isNativePushBridgeAvailable()) {
    await deleteNativePushToken().catch(() => {});
  }
  const deviceId = getOrCreateDeviceId();
  await setDeviceEngagementEnabled(deviceId, false, null, true);
}

export async function unregisterPushTokens(uid: string): Promise<void> {
  if (!db) return;
  const messaging = await getMessagingInstance();
  if (messaging) {
    try {
      const token = await getToken(messaging);
      if (token) {
        await deleteDoc(doc(db, "users", uid, "fcmTokens", hashToken(token)));
      }
    } catch {
      /* ignore */
    }
  }
}

export async function subscribeForegroundMessages(
  onNotify: (title: string, body: string) => void,
): Promise<(() => void) | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    return onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "소원로또";
      const body = payload.notification?.body ?? "새 알림이 도착했습니다.";
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const link = payload.data?.link;
          new Notification(title, {
            body,
            icon: "/icon-192.png",
            data: link ? { link } : undefined,
          });
        } catch {
          /* ignore */
        }
      }
      onNotify(title, body);
    });
  } catch {
    return null;
  }
}
