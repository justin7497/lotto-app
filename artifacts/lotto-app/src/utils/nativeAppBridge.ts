import { isAppWebViewShell } from "@/utils/nativeQrBridge";

export interface NativeAppVersionInfo {
  versionCode?: number;
  versionName: string;
  source?: "bridge" | "user-agent";
}

export interface NativePlayStoreUpdateCheck {
  ok: boolean;
  updateAvailable: boolean;
  versionCode?: number;
  versionName?: string;
  availableVersionCode?: number;
  error?: string;
}

interface SowonLottoNativeAppBridge {
  getAppVersionInfo?: () => string;
  checkPlayStoreUpdate?: (callbackName: string) => void;
  openPlayStore?: () => void;
  startPlayStoreUpdate?: () => void;
}

function getNativeBridgeObject(): SowonLottoNativeAppBridge | null {
  if (!isAppWebViewShell()) return null;
  return (window as Window & { SowonLottoNative?: SowonLottoNativeAppBridge }).SowonLottoNative ?? null;
}

function getNativeVersionBridge(): SowonLottoNativeAppBridge | null {
  const bridge = getNativeBridgeObject();
  if (!bridge?.getAppVersionInfo) return null;
  return bridge;
}

export function compareSemverLike(a: string, b: string): number {
  const pa = a.split(".").map((part) => parseInt(part, 10) || 0);
  const pb = b.split(".").map((part) => parseInt(part, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** SowonLottoApp/1.0.26 또는 SowonLottoApp/1.0.26 vc/27 */
export function parseNativeVersionFromUserAgent(
  ua = navigator.userAgent,
): NativeAppVersionInfo | null {
  if (!isAppWebViewShell()) return null;
  const match = ua.match(/SowonLottoApp\/([0-9.]+)(?:\s+vc\/(\d+))?/i);
  if (!match?.[1]) return null;
  const versionName = match[1];
  const versionCode = match[2] ? Number(match[2]) : undefined;
  return {
    versionName,
    versionCode: Number.isFinite(versionCode) ? versionCode : undefined,
    source: "user-agent",
  };
}

export function isNativeAppUpdateBridgeAvailable(): boolean {
  return getNativeVersionBridge() != null;
}

export function isNativePlayStoreUpdateBridgeAvailable(): boolean {
  return typeof getNativeBridgeObject()?.checkPlayStoreUpdate === "function";
}

export function isNativeAndroidShell(): boolean {
  return isAppWebViewShell();
}

export function isNativeVersionOlderThan(
  local: NativeAppVersionInfo,
  remote: { androidVersionCode?: number; androidVersionName?: string },
): boolean {
  if (typeof remote.androidVersionCode === "number") {
    if (typeof local.versionCode === "number" && local.versionCode > 0) {
      if (local.versionCode < remote.androidVersionCode) return true;
      if (local.versionCode >= remote.androidVersionCode) return false;
    }
  }
  if (local.versionName && remote.androidVersionName) {
    return compareSemverLike(local.versionName, remote.androidVersionName) < 0;
  }
  return false;
}

export function getNativeAppVersionInfo(): NativeAppVersionInfo | null {
  const bridge = getNativeVersionBridge();
  if (bridge?.getAppVersionInfo) {
    try {
      const raw = bridge.getAppVersionInfo();
      const parsed = JSON.parse(raw) as NativeAppVersionInfo & { error?: string };
      if (!parsed.error && typeof parsed.versionCode === "number") {
        return {
          versionCode: parsed.versionCode,
          versionName: parsed.versionName || "",
          source: "bridge",
        };
      }
    } catch {
      // fall through to UA
    }
  }
  return parseNativeVersionFromUserAgent();
}

export function checkNativePlayStoreUpdate(): Promise<NativePlayStoreUpdateCheck> {
  const bridge = getNativeBridgeObject();
  const checkUpdate = bridge?.checkPlayStoreUpdate;
  if (!checkUpdate) {
    return Promise.resolve({ ok: false, updateAvailable: false, error: "bridge_unavailable" });
  }

  return new Promise((resolve) => {
    const callbackName = `__sowonUpdateCb_${Date.now()}`;
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, updateAvailable: false, error: "timeout" });
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timer);
      Reflect.deleteProperty(window, callbackName);
    };

    const callback = (result: NativePlayStoreUpdateCheck) => {
      cleanup();
      resolve(result ?? { ok: false, updateAvailable: false, error: "empty_result" });
    };
    Object.defineProperty(window, callbackName, {
      value: callback,
      configurable: true,
      writable: true,
    });

    try {
      checkUpdate(callbackName);
    } catch {
      cleanup();
      resolve({ ok: false, updateAvailable: false, error: "bridge_call_failed" });
    }
  });
}

export function openNativePlayStoreListing(): boolean {
  const bridge = getNativeBridgeObject();
  if (!bridge?.openPlayStore) return false;
  try {
    bridge.openPlayStore();
    return true;
  } catch {
    return false;
  }
}

export function startNativePlayStoreUpdate(): boolean {
  const bridge = getNativeBridgeObject();
  if (!bridge?.startPlayStoreUpdate) return false;
  try {
    bridge.startPlayStoreUpdate();
    return true;
  } catch {
    return false;
  }
}
