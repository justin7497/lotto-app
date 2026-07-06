import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { getApps } from "firebase/app";
import { db, isFirebaseConfigured } from "@/lib/firebase";

const SW_PATH = "/firebase-messaging-sw.js";

function getVapidKey(): string | null {
  const key = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  return key?.trim() || null;
}

function hashToken(token: string): string {
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

  messagingInstance = getMessaging(app);
  return messagingInstance;
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
  return isFirebaseConfigured && (await isSupported()) && Boolean(getVapidKey());
}

export async function registerPushToken(uid: string): Promise<string | null> {
  const vapidKey = getVapidKey();
  if (!vapidKey || !db) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await ensureServiceWorker();
  if (!registration) return null;

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return null;

  await setDoc(doc(db, "users", uid, "fcmTokens", hashToken(token)), {
    token,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent.slice(0, 200),
  });

  return token;
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
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "로또 당첨 알림";
    const body = payload.notification?.body ?? "추출번호 페이지에서 확인해 보세요.";
    onNotify(title, body);
  });
}
