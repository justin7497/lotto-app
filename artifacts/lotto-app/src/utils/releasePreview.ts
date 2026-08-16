export interface ReleasePreviewGit {
  branch: string;
  shortHash: string;
  statusLines: string[];
  changedFiles: string[];
  diffStat: string;
  hasChanges: boolean;
}

export interface ReleasePreviewVersions {
  webBuildId: string;
  androidVersionName?: string;
  androidVersionCode?: number;
  deployedBuildId?: string | null;
  deployedAt?: string | null;
}

export interface ReleasePreview {
  generatedAt: string;
  versions: ReleasePreviewVersions;
  git: ReleasePreviewGit;
}

const PREVIEW_URL = `${import.meta.env.BASE_URL}release-preview.json`;
const LIVE_API = "/api/dev/release-preview";

export async function fetchReleasePreview(): Promise<ReleasePreview | null> {
  if (import.meta.env.DEV) {
    try {
      const live = await fetch(LIVE_API, { cache: "no-store" });
      if (live.ok) {
        return (await live.json()) as ReleasePreview;
      }
    } catch {
      // fall through to static file
    }
  }

  try {
    const res = await fetch(`${PREVIEW_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ReleasePreview;
  } catch {
    return null;
  }
}

export function shortBuildId(buildId: string): string {
  if (!buildId || buildId === "dev") return "개발";
  return buildId.length > 22 ? `${buildId.slice(0, 22)}…` : buildId;
}
