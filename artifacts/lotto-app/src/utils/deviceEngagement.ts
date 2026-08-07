import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { isNativePushBridgeAvailable } from "@/utils/nativePushBridge";

const SETTINGS_KEY = "lotto_engagement_push_v1";
const INSTALLED_AT_KEY = "lotto_device_installed_at_v1";
const PENDING_LINK_UID_KEY = "lotto_device_pending_link_uid_v1";
/** Firestore devices 문서는 클라이언트 read 불가(rules) — 등록 성공 시에만 로컬에 기록 */
const DEVICE_SYNCED_KEY = "lotto_device_firestore_synced_v1";

export interface DeviceEngagementSettings {
  engagementPushEnabled: boolean;
  /** 설정에서 사용자가 직접 끈 경우 */
  optOut?: boolean;
}

function parseSettings(data: Partial<DeviceEngagementSettings> | null): DeviceEngagementSettings {
  if (!data) {
    return { engagementPushEnabled: true, optOut: false };
  }
  const optOut = Boolean(data.optOut);
  return {
    optOut,
    engagementPushEnabled: optOut ? false : Boolean(data.engagementPushEnabled ?? true),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function getDeviceInstalledAt(): string {
  try {
    const existing = localStorage.getItem(INSTALLED_AT_KEY);
    if (existing) return existing;
    const installedAt = nowIso();
    localStorage.setItem(INSTALLED_AT_KEY, installedAt);
    return installedAt;
  } catch {
    return nowIso();
  }
}

export function loadEngagementSettings(): DeviceEngagementSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { engagementPushEnabled: true, optOut: false };
    const data = JSON.parse(raw) as Partial<DeviceEngagementSettings>;
    return parseSettings(data);
  } catch {
    return { engagementPushEnabled: true, optOut: false };
  }
}

export function saveEngagementSettingsLocal(
  partial: Partial<DeviceEngagementSettings>,
): DeviceEngagementSettings {
  const next = { ...loadEngagementSettings(), ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function deviceRef(deviceId: string) {
  if (!db) throw new Error("Firestore is not configured");
  return doc(db, "devices", deviceId);
}

function isDeviceSyncedToFirestore(): boolean {
  try {
    return localStorage.getItem(DEVICE_SYNCED_KEY) === "1";
  } catch {
    return false;
  }
}

function markDeviceSyncedToFirestore(): void {
  try {
    localStorage.setItem(DEVICE_SYNCED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearDeviceSyncedToFirestore(): void {
  try {
    localStorage.removeItem(DEVICE_SYNCED_KEY);
  } catch {
    /* ignore */
  }
}

function readPendingLinkUid(): string | null {
  try {
    return localStorage.getItem(PENDING_LINK_UID_KEY);
  } catch {
    return null;
  }
}

function clearPendingLinkUid(): void {
  try {
    localStorage.removeItem(PENDING_LINK_UID_KEY);
  } catch {
    /* ignore */
  }
}

function savePendingLinkUid(uid: string): void {
  try {
    localStorage.setItem(PENDING_LINK_UID_KEY, uid);
  } catch {
    /* ignore */
  }
}

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "permission-denied"
  );
}

function buildDevicePayload(
  deviceId: string,
  data: {
    fcmToken?: string;
    engagementPushEnabled?: boolean;
    linkedUid?: string | null;
  },
): Record<string, unknown> {
  const installedAt = getDeviceInstalledAt();
  const current = loadEngagementSettings();
  const payload: Record<string, unknown> = {
    deviceId,
    installedAt,
    lastActiveAt: nowIso(),
    engagementPushEnabled: data.engagementPushEnabled ?? current.engagementPushEnabled,
    updatedAt: nowIso(),
    userAgent: navigator.userAgent.slice(0, 200),
    platform: isNativePushBridgeAvailable()
      ? "android-app"
      : navigator.platform?.slice(0, 80) ?? "unknown",
  };

  if (data.fcmToken) payload.fcmToken = data.fcmToken;

  if (data.linkedUid !== undefined) {
    payload.linkedUid = data.linkedUid;
  } else {
    const pendingUid = readPendingLinkUid();
    if (pendingUid) payload.linkedUid = pendingUid;
  }

  return payload;
}

/**
 * Firestore devices 규칙:
 * - read: 클라이언트 불가 → getDoc 사용 금지
 * - create: fcmToken 필수
 * - update: 기존 문서만
 */
export async function syncDeviceRecord(
  deviceId: string,
  data: {
    fcmToken?: string;
    engagementPushEnabled?: boolean;
    linkedUid?: string | null;
  },
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const ref = deviceRef(deviceId);
  const synced = isDeviceSyncedToFirestore();

  try {
    if (!synced) {
      if (!data.fcmToken) return;
      await setDoc(ref, buildDevicePayload(deviceId, data));
      markDeviceSyncedToFirestore();
      clearPendingLinkUid();
      return;
    }

    await setDoc(ref, buildDevicePayload(deviceId, data), { merge: true });
    if (data.linkedUid !== undefined) clearPendingLinkUid();
  } catch (error) {
    if (isPermissionDenied(error)) {
      clearDeviceSyncedToFirestore();
      return;
    }
    throw error;
  }
}

export async function setDeviceEngagementEnabled(
  deviceId: string,
  enabled: boolean,
  fcmToken?: string | null,
  optOut?: boolean,
): Promise<void> {
  const resolvedOptOut = optOut ?? !enabled;
  saveEngagementSettingsLocal({
    engagementPushEnabled: enabled,
    optOut: resolvedOptOut,
  });
  await syncDeviceRecord(deviceId, {
    engagementPushEnabled: enabled,
    fcmToken: fcmToken ?? undefined,
  });
}

/** 기기 활동 시각 갱신 — Firestore에 등록된 기기만 */
export async function touchDeviceActivity(deviceId?: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !isDeviceSyncedToFirestore()) return;
  const id = deviceId ?? getOrCreateDeviceId();
  await syncDeviceRecord(id, {});
}

/** 로그인 사용자와 기기 연결 — 아직 Firestore 미등록이면 푸시 등록 시까지 대기 */
export async function linkDeviceToUser(uid: string, fcmToken?: string | null): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  if (!isDeviceSyncedToFirestore()) {
    savePendingLinkUid(uid);
    return;
  }
  const deviceId = getOrCreateDeviceId();
  await syncDeviceRecord(deviceId, {
    linkedUid: uid,
    fcmToken: fcmToken ?? undefined,
  });
}
