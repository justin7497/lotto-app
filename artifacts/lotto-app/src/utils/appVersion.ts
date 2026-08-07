const VERSION_URL = `${import.meta.env.BASE_URL}app-version.json`;

export interface RemoteAppVersion {
  buildId: string;
  builtAt?: string;
  label?: string;
}

export function getLocalBuildId(): string {
  return (import.meta.env.VITE_APP_BUILD_ID as string | undefined) || "dev";
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
