/** Firestore devices 문서 ID — 하드웨어 시리얼이 아닌 앱이 부여한 기기 식별자 */
export function formatDeviceIdShort(deviceId: string): string {
  if (deviceId.length <= 14) return deviceId;
  return `${deviceId.slice(0, 8)}…${deviceId.slice(-4)}`;
}

export function formatAdminPlatform(platform: string | null | undefined): string {
  if (!platform) return "알 수 없음";
  const map: Record<string, string> = {
    "android-app": "Android 앱",
    Win32: "Windows PC",
    MacIntel: "Mac",
    Linux: "Linux",
    iPhone: "iPhone",
    iPad: "iPad",
  };
  return map[platform] ?? platform;
}

/** 운영 점검용 — UA에서 OS·브라우저만 간단히 추출 */
export function parseUserAgentSummary(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const parts: string[] = [];

  if (/android/i.test(userAgent)) parts.push("Android");
  else if (/iphone|ipad/i.test(userAgent)) parts.push("iOS");
  else if (/windows/i.test(userAgent)) parts.push("Windows");
  else if (/mac os x/i.test(userAgent)) parts.push("macOS");

  if (/edg\//i.test(userAgent)) parts.push("Edge");
  else if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) parts.push("Chrome");
  else if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) parts.push("Safari");
  else if (/firefox\//i.test(userAgent)) parts.push("Firefox");

  return parts.length > 0 ? parts.join(" · ") : null;
}

export type DevicePushState = "ready" | "no_token" | "opt_out";

export function getDevicePushState(device: {
  hasFcmToken: boolean;
  engagementPushEnabled: boolean;
}): DevicePushState {
  if (!device.hasFcmToken) return "no_token";
  if (device.engagementPushEnabled === false) return "opt_out";
  return "ready";
}

export function formatDevicePushState(state: DevicePushState): {
  label: string;
  badgeClass: string;
} {
  switch (state) {
    case "ready":
      return { label: "발송 가능", badgeClass: "admin-device-badge--on" };
    case "no_token":
      return { label: "토큰 없음", badgeClass: "admin-device-badge--warn" };
    case "opt_out":
      return { label: "푸시 거부", badgeClass: "admin-device-badge--muted" };
  }
}

export async function copyDeviceId(deviceId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(deviceId);
    return true;
  } catch {
    return false;
  }
}
