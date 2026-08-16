import {
  checkNativePlayStoreUpdate,
  getNativeAppVersionInfo,
  isNativeAndroidShell,
  isNativePlayStoreUpdateBridgeAvailable,
  isNativeVersionOlderThan,
  openNativePlayStoreListing,
  startNativePlayStoreUpdate,
} from "@/utils/nativeAppBridge";
import { SLIP_ENCODE_VERSION } from "@/utils/mobileSlip";

const VERSION_URL = `${import.meta.env.BASE_URL}app-version.json`;
const DISMISS_PREFIX = "app-update-dismiss:";

export interface RemoteAppVersion {
  buildId: string;
  builtAt?: string;
  label?: string;
  /** false면 팝업 없이 조용히 새로고침 (기본 true) */
  prompt?: boolean;
  /** Play 스토어 최신 versionCode (배포 시 build.gradle과 동기화) */
  androidVersionCode?: number;
  androidVersionName?: string;
  /** 모바일 슬립 MSG_ESLIP 인코딩 규칙 버전 */
  slipEncodeVersion?: number;
}

export type AppUpdateKind = "web" | "play-store";

export interface AppUpdateInfo {
  id: string;
  kind: AppUpdateKind;
  label?: string;
  prompt?: boolean;
  versionName?: string;
}

export function getLocalBuildId(): string {
  return (import.meta.env.VITE_APP_BUILD_ID as string | undefined) || "dev";
}

export function shouldPromptForUpdate(update: Pick<AppUpdateInfo, "prompt">): boolean {
  return update.prompt !== false;
}

export function isUpdatePromptDismissed(updateId: string): boolean {
  try {
    return sessionStorage.getItem(`${DISMISS_PREFIX}${updateId}`) === "1";
  } catch {
    return false;
  }
}

export function dismissUpdatePrompt(updateId: string): void {
  try {
    sessionStorage.setItem(`${DISMISS_PREFIX}${updateId}`, "1");
  } catch {
    // ignore
  }
}

export function isSlipRoute(pathname: string): boolean {
  return pathname === "/slip" || pathname.startsWith("/slip/");
}

export async function fetchRemoteAppVersion(): Promise<RemoteAppVersion | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as RemoteAppVersion;
    if (!data?.buildId) return null;
    return data;
  } catch {
    return null;
  }
}

async function checkPlayStoreUpdateFromServer(
  remote: RemoteAppVersion,
): Promise<AppUpdateInfo | null> {
  if (!isNativeAndroidShell()) return null;
  if (typeof remote.androidVersionCode !== "number" && !remote.androidVersionName) return null;

  const local = getNativeAppVersionInfo();
  if (!local || !isNativeVersionOlderThan(local, remote)) return null;

  return {
    id: `android-${remote.androidVersionCode ?? remote.androidVersionName}`,
    kind: "play-store",
    label: remote.androidVersionName || remote.label,
    prompt: remote.prompt !== false,
    versionName: remote.androidVersionName,
  };
}

async function checkPlayStoreUpdateFromPlayApi(): Promise<AppUpdateInfo | null> {
  if (!isNativePlayStoreUpdateBridgeAvailable()) return null;

  const result = await checkNativePlayStoreUpdate();
  if (!result.ok || !result.updateAvailable) return null;

  const availableCode = result.availableVersionCode ?? 0;
  const localCode = result.versionCode ?? getNativeAppVersionInfo()?.versionCode ?? 0;
  if (availableCode <= localCode) return null;

  return {
    id: `android-play-${availableCode}`,
    kind: "play-store",
    label: result.versionName,
    prompt: true,
    versionName: result.versionName,
  };
}

async function checkWebAppUpdate(remote: RemoteAppVersion): Promise<AppUpdateInfo | null> {
  if (import.meta.env.DEV) return null;

  const local = getLocalBuildId();
  const remoteSlipVer =
    typeof remote.slipEncodeVersion === "number" ? remote.slipEncodeVersion : 0;
  const slipStale = remoteSlipVer > SLIP_ENCODE_VERSION;
  if (remote.buildId === local && !slipStale) return null;

  return {
    id: slipStale ? `slip-enc-${remoteSlipVer}` : remote.buildId,
    kind: "web",
    label: remote.label,
    prompt: remote.prompt !== false,
  };
}

/** Play 스토어 앱·웹 배포 모두 확인 (네이티브 앱이면 APK 우선) */
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  const remote = await fetchRemoteAppVersion();
  if (!remote) return null;

  if (isNativeAndroidShell()) {
    const playApiUpdate = await checkPlayStoreUpdateFromPlayApi();
    if (playApiUpdate) return playApiUpdate;

    const playServerUpdate = await checkPlayStoreUpdateFromServer(remote);
    if (playServerUpdate) return playServerUpdate;
  }

  return checkWebAppUpdate(remote);
}

/** QR 화면 — 구 인코딩(A:) 캐시 여부 */
export { isLegacySlipEncodeToken as isLegacySlipPayload } from "@/utils/slipEncodeRules";

export function getLocalSlipEncodeVersion(): number {
  return SLIP_ENCODE_VERSION;
}

/** @deprecated checkForAppUpdate 사용 */
export async function checkAppUpdateAvailable(): Promise<RemoteAppVersion | null> {
  const update = await checkForAppUpdate();
  if (!update || update.kind !== "web") return null;
  return {
    buildId: update.id,
    label: update.label,
    prompt: update.prompt,
  };
}

export function applyAppUpdate(update?: AppUpdateInfo): void {
  if (update?.kind === "play-store") {
    if (!startNativePlayStoreUpdate() && !openNativePlayStoreListing()) {
      const url = "https://play.google.com/store/apps/details?id=com.ljh.sowonlotto";
      window.location.href = url;
    }
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}
