const VERSION_URL = `${import.meta.env.BASE_URL}app-version.json`;
const DISMISS_PREFIX = "app-update-dismiss:";

export interface RemoteAppVersion {
  buildId: string;
  builtAt?: string;
  label?: string;
  /** false면 팝업 없이 조용히 새로고침 (기본 true) */
  prompt?: boolean;
}

export function getLocalBuildId(): string {
  return (import.meta.env.VITE_APP_BUILD_ID as string | undefined) || "dev";
}

export function shouldPromptForUpdate(remote: RemoteAppVersion): boolean {
  return remote.prompt !== false;
}

export function isUpdatePromptDismissed(buildId: string): boolean {
  try {
    return sessionStorage.getItem(`${DISMISS_PREFIX}${buildId}`) === "1";
  } catch {
    return false;
  }
}

export function dismissUpdatePrompt(buildId: string): void {
  try {
    sessionStorage.setItem(`${DISMISS_PREFIX}${buildId}`, "1");
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

export async function checkAppUpdateAvailable(): Promise<RemoteAppVersion | null> {
  if (import.meta.env.DEV) return null;

  const local = getLocalBuildId();
  const remote = await fetchRemoteAppVersion();
  if (!remote || remote.buildId === local) return null;
  return remote;
}

export function applyAppUpdate(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}
