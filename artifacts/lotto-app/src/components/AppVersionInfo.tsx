import { useEffect, useState } from "react";
import { fetchRemoteAppVersion } from "@/utils/appVersion";
import { getNativeAppVersionInfo } from "@/utils/nativeAppBridge";
import { fetchReleasePreview, shortBuildId, type ReleasePreview } from "@/utils/releasePreview";

export interface VersionDisplay {
  googleApp: string;
  apk: string;
  preview: ReleasePreview | null;
}

function formatVersionLabel(name?: string, code?: number): string {
  if (!name) return "—";
  const codeSuffix = typeof code === "number" && code > 0 ? ` (${code})` : "";
  return `${name}${codeSuffix}`;
}

export function useAppVersionDisplay(): VersionDisplay {
  const [googleApp, setGoogleApp] = useState("…");
  const [apk, setApk] = useState("…");
  const [preview, setPreview] = useState<ReleasePreview | null>(null);

  useEffect(() => {
    const native = getNativeAppVersionInfo();
    if (native?.versionName) {
      setApk(formatVersionLabel(native.versionName, native.versionCode));
    }

    void fetchReleasePreview().then((data) => {
      if (!data) return;
      setPreview(data);
      const v = data.versions;
      if (v.androidVersionName) {
        setGoogleApp(formatVersionLabel(v.androidVersionName, v.androidVersionCode));
      }
      if (!native?.versionName && v.androidVersionName) {
        setApk(formatVersionLabel(v.androidVersionName, v.androidVersionCode));
      }
    });

    void fetchRemoteAppVersion().then((remote) => {
      if (!remote) return;
      setGoogleApp(
        formatVersionLabel(
          remote.androidVersionName || remote.label,
          remote.androidVersionCode,
        ),
      );
      if (!native?.versionName) {
        setApk(
          formatVersionLabel(
            remote.androidVersionName || remote.label,
            remote.androidVersionCode,
          ),
        );
      }
    });
  }, []);

  return { googleApp, apk, preview };
}

interface AppVersionInfoProps {
  layout?: "footer" | "panel";
  className?: string;
}

export default function AppVersionInfo({ layout = "footer", className = "" }: AppVersionInfoProps) {
  const { googleApp, apk, preview } = useAppVersionDisplay();
  const webBuild = preview?.versions.webBuildId
    ? shortBuildId(preview.versions.webBuildId)
    : "—";

  if (layout === "panel") {
    return (
      <dl className={`dev-release__version-grid ${className}`.trim()}>
        <div>
          <dt>구글 앱 버전</dt>
          <dd>{googleApp}</dd>
        </div>
        <div>
          <dt>APK 버전</dt>
          <dd>{apk}</dd>
        </div>
        <div>
          <dt>웹 빌드</dt>
          <dd>{webBuild}</dd>
        </div>
      </dl>
    );
  }

  return (
    <section className={`notif-settings notif-settings--version ${className}`.trim()}>
      <h2 className="notif-settings__section-title">버전 정보</h2>
      <div className="notif-settings__card notif-settings__version-card">
        <dl className="notif-settings__version-list">
          <div className="notif-settings__version-row">
            <dt className="notif-settings__version-label">구글 앱 버전</dt>
            <dd className="notif-settings__version-value">{googleApp}</dd>
          </div>
          <div className="notif-settings__version-row">
            <dt className="notif-settings__version-label">APK 버전</dt>
            <dd className="notif-settings__version-value">{apk}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
