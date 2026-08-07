import { isAppWebViewShell } from "@/utils/nativeQrBridge";

export type NativePushPermission = "granted" | "denied" | "default";

export interface NativePushResult {
  ok: boolean;
  token?: string;
  permission?: NativePushPermission;
  error?: string;
}

interface SowonLottoNativeBridge {
  isPushBridgeAvailable?: () => boolean;
  getPushPermissionState?: () => NativePushPermission;
  fetchPushToken?: (callbackName: string) => void;
  deletePushToken?: (callbackName: string) => void;
  openNotificationSettings?: () => void;
}

declare global {
  interface Window {
    SowonLottoNative?: SowonLottoNativeBridge;
  }
}

function getNativeBridge(): SowonLottoNativeBridge | null {
  if (!isAppWebViewShell()) return null;
  const bridge = window.SowonLottoNative;
  if (!bridge?.fetchPushToken) return null;
  return bridge;
}

export function isNativePushBridgeAvailable(): boolean {
  const bridge = getNativeBridge();
  if (!bridge) return false;
  try {
    return bridge.isPushBridgeAvailable?.() !== false;
  } catch {
    return false;
  }
}

export function getNativePushPermissionState(): NativePushPermission | null {
  const bridge = getNativeBridge();
  if (!bridge?.getPushPermissionState) return null;
  try {
    return bridge.getPushPermissionState();
  } catch {
    return null;
  }
}

function callNativePush(
  method: "fetchPushToken" | "deletePushToken",
): Promise<NativePushResult> {
  const bridge = getNativeBridge();
  if (!bridge?.[method]) {
    return Promise.resolve({ ok: false, error: "bridge_unavailable" });
  }

  return new Promise((resolve) => {
    const callbackName = `__sowonPushCb_${Date.now()}`;
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: "timeout" });
    }, 20000);

    const cleanup = () => {
      window.clearTimeout(timer);
      Reflect.deleteProperty(window, callbackName);
    };

    const callback = (result: NativePushResult) => {
      cleanup();
      resolve(result ?? { ok: false, error: "empty_result" });
    };
    Object.defineProperty(window, callbackName, {
      value: callback,
      configurable: true,
      writable: true,
    });

    try {
      bridge[method]!(callbackName);
    } catch {
      cleanup();
      resolve({ ok: false, error: "bridge_call_failed" });
    }
  });
}

export async function fetchNativePushToken(): Promise<NativePushResult> {
  return callNativePush("fetchPushToken");
}

export async function deleteNativePushToken(): Promise<NativePushResult> {
  return callNativePush("deletePushToken");
}

export function nativePushPermissionHint(): string | null {
  if (!isNativePushBridgeAvailable()) return null;
  const state = getNativePushPermissionState();
  if (state === "denied" || state === "default") {
    return "알림이 허용되지 않았습니다. 아래 「알림 설정 열기」에서 소원로또 알림을 켜 주세요.";
  }
  return null;
}

export function openNativeNotificationSettings(): boolean {
  const bridge = getNativeBridge();
  if (!bridge?.openNotificationSettings) return false;
  try {
    bridge.openNotificationSettings();
    return true;
  } catch {
    return false;
  }
}
