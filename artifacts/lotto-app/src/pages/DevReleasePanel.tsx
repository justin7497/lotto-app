import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, RefreshCw, Server } from "lucide-react";
import AppVersionInfo from "@/components/AppVersionInfo";
import { PREVIEW_ROUTE_GROUPS, PREVIEW_ROUTES } from "@/data/previewRoutes";
import { fetchReleasePreview, type ReleasePreview } from "@/utils/releasePreview";

export default function DevReleasePanel() {
  const [preview, setPreview] = useState<ReleasePreview | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetchWithRetry = async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const previewData = await fetchReleasePreview();
          if (previewData) return previewData;
          await new Promise((r) => window.setTimeout(r, 600));
        }
        return null;
      };

      const [previewData, health] = await Promise.all([
        fetchWithRetry(),
        fetch("/api/health", { cache: "no-store" })
          .then((r) => r.ok)
          .catch(() => false),
      ]);
      setPreview(previewData);
      setApiOk(health);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const routesByGroup = useMemo(() => {
    const map = new Map<string, typeof PREVIEW_ROUTES>();
    for (const group of PREVIEW_ROUTE_GROUPS) {
      map.set(
        group,
        PREVIEW_ROUTES.filter((r) => r.group === group),
      );
    }
    return map;
  }, []);

  if (!import.meta.env.DEV) {
    return (
      <div className="page-content">
        <p className="text-sm text-gray-500">개발 환경에서만 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="page-content page-content--loose dev-release">
      <header className="dev-release__header">
        <h1 className="dev-release__title">빌드 · 화면 미리보기</h1>
        <p className="dev-release__lead">
          빌드 전 변경 사항과 버전을 확인하고, 모든 화면을 로컬 서버에서 열어볼 수 있습니다.
        </p>
        <div className="dev-release__meta">
          <span className={`dev-release__pill${apiOk ? " dev-release__pill--ok" : ""}`}>
            <Server className="h-4 w-4" aria-hidden />
            API {apiOk ? "연결됨 (8080)" : apiOk === false ? "미연결" : "확인 중…"}
          </span>
          <button type="button" className="dev-release__refresh" onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4${loading ? " animate-spin" : ""}`} aria-hidden />
            새로고침
          </button>
        </div>
      </header>

      <section className="dev-release__card" aria-labelledby="dev-version-title">
        <h2 id="dev-version-title" className="dev-release__card-title">
          버전 정보
        </h2>
        <AppVersionInfo layout="panel" />
        {preview?.versions.deployedBuildId ? (
          <p className="dev-release__note">
            마지막 배포 빌드: <code>{preview.versions.deployedBuildId}</code>
          </p>
        ) : null}
      </section>

      <section className="dev-release__card" aria-labelledby="dev-changes-title">
        <h2 id="dev-changes-title" className="dev-release__card-title">
          빌드 전 변경 사항
        </h2>
        {preview ? (
          <>
            <p className="dev-release__git-head">
              <code>
                {preview.git.branch} @ {preview.git.shortHash}
              </code>
              <span className="dev-release__git-stat">{preview.git.diffStat}</span>
            </p>
            {preview.git.changedFiles.length > 0 ? (
              <ul className="dev-release__file-list">
                {preview.git.changedFiles.slice(0, 80).map((file) => (
                  <li key={file}>
                    <code>{file}</code>
                  </li>
                ))}
                {preview.git.changedFiles.length > 80 ? (
                  <li className="dev-release__more">
                    … 외 {preview.git.changedFiles.length - 80}개 파일
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="dev-release__empty">커밋 대비 변경된 파일이 없습니다.</p>
            )}
          </>
        ) : (
          <p className="dev-release__empty">
            미리보기 데이터가 없습니다. 루트에서 <code>pnpm dev:lotto</code> 또는{" "}
            <code>node scripts/write-release-preview.mjs</code> 를 실행하세요.
          </p>
        )}
      </section>

      <section className="dev-release__card" aria-labelledby="dev-build-title">
        <h2 id="dev-build-title" className="dev-release__card-title">
          통합 빌드 명령
        </h2>
        <ul className="dev-release__commands">
          <li>
            <code>pnpm dev:lotto</code> — 로컬 앱 + API (5173 / 8080)
          </li>
          <li>
            <code>pnpm release:lotto</code> — 변경 미리보기 + 웹 빌드
          </li>
          <li>
            <code>pnpm release:lotto --aab</code> — 웹 + Android AAB
          </li>
          <li>
            <code>pnpm release:lotto --deploy</code> — 웹 빌드 + Firebase 배포
          </li>
          <li>
            <code>pnpm release:lotto --aab --deploy</code> — 전체 한 번에
          </li>
        </ul>
      </section>

      <section className="dev-release__card" aria-labelledby="dev-screens-title">
        <h2 id="dev-screens-title" className="dev-release__card-title">
          모든 화면
        </h2>
        <p className="dev-release__note">각 링크는 새 탭에서 열립니다.</p>
        {PREVIEW_ROUTE_GROUPS.map((group) => (
          <div key={group} className="dev-release__route-group">
            <h3 className="dev-release__route-group-title">{group}</h3>
            <ul className="dev-release__route-list">
              {(routesByGroup.get(group) ?? []).map((route) => (
                <li key={route.path}>
                  <a
                    href={route.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-release__route-link"
                  >
                    {route.label}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="dev-release__footer">
        <Link href="/notification-settings" className="text-link-brand">
          알림 설정 (버전 표시)
        </Link>
      </p>
    </div>
  );
}
