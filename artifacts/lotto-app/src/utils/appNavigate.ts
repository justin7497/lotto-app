const basePath = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function toAbsolutePath(path: string): string {
  const q = path.indexOf("?");
  const pathname = q === -1 ? path : path.slice(0, q);
  const search = q === -1 ? "" : path.slice(q);
  const absolute = `${basePath()}${pathname}`.replace(/\/{2,}/g, "/") || "/";
  return `${absolute}${search}`;
}

/** wouter가 구독하는 History API로 클라이언트 라우팅 */
export function appNavigate(path: string, { replace = false }: { replace?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  const url = toAbsolutePath(path);
  if (replace) {
    window.history.replaceState(window.history.state, "", url);
  } else {
    window.history.pushState(window.history.state, "", url);
  }
}

export function appPathname(): string {
  if (typeof window === "undefined") return "/";
  const base = basePath();
  const path = window.location.pathname;
  if (!base) return path || "/";
  if (path === base) return "/";
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || "/";
  return path || "/";
}
