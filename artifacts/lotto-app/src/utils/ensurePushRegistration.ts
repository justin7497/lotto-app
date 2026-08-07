import {
  isPushSupported,
  registerDeviceEngagementPush,
  registerPushToken,
  requestPushPermission,
} from "@/lib/messaging";
import { linkDeviceToUser } from "@/utils/deviceEngagement";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { isNativePushBridgeAvailable, nativePushPermissionHint, getNativePushPermissionState } from "@/utils/nativePushBridge";

export type PushRegistrationStatus = {
  deviceId: string;
  permission: NotificationPermission | "unsupported";
  engagementRegistered: boolean;
  userTokenRegistered: boolean;
  nativeApp: boolean;
  hint: string | null;
};

export async function ensurePushRegistration(uid: string): Promise<PushRegistrationStatus> {
  const deviceId = getOrCreateDeviceId();
  const nativeApp = isNativePushBridgeAvailable();
  const supported = await isPushSupported();

  if (!supported) {
    return {
      deviceId,
      permission: "unsupported",
      engagementRegistered: false,
      userTokenRegistered: false,
      nativeApp,
      hint: "이 환경에서는 푸시를 지원하지 않습니다.",
    };
  }

  let permission: NotificationPermission = nativeApp
    ? ((getNativePushPermissionState() ??
        (typeof Notification !== "undefined" ? Notification.permission : "default")) as NotificationPermission)
    : await requestPushPermission();

  const engagementToken = await registerDeviceEngagementPush();
  await linkDeviceToUser(uid, engagementToken);

  if (nativeApp) {
    const afterPermission =
      getNativePushPermissionState() ??
      (engagementToken ? "granted" : null);
    if (afterPermission) {
      permission = afterPermission;
    } else if (engagementToken) {
      permission = "granted";
    }
  }

  let userTokenRegistered = false;
  if (permission === "granted" || engagementToken) {
    const userToken = await registerPushToken(uid);
    userTokenRegistered = Boolean(userToken);
    if (!userTokenRegistered && engagementToken) {
      await linkDeviceToUser(uid);
    }
  }

  const hint =
    nativePushPermissionHint() ??
    (permission === "denied"
      ? "알림이 차단되어 있습니다. 기기 설정에서 소원로또 알림을 허용해 주세요."
      : !engagementToken && !userTokenRegistered
        ? "알림 토큰을 받지 못했습니다. 아래 「이 기기 알림 등록」을 눌러 주세요."
        : null);

  return {
    deviceId,
    permission,
    engagementRegistered: Boolean(engagementToken),
    userTokenRegistered,
    nativeApp,
    hint,
  };
}
