import { appNavigate } from "@/utils/appNavigate";
import { resolveBackFallback } from "@/utils/backFallback";

/** wouter location (pathname + search) 스냅샷 */
const navStack: string[] = [];
let lastSnap: string | null = null;
let suppressNextPush = false;

function syncNativeRoute(location: string): void {
  if (typeof window === "undefined") return;
  const path = location.split("?")[0] || "/";
  window.__sowonAtHome = path === "/";
  try {
    window.SowonLottoRoute?.setPathname(path);
  } catch {
    // JavascriptInterface 미준비
  }
}

/** 라우트 변경 시 스택 기록 (App NavStackRecorder) */
export function recordRouteChange(location: string): void {
  if (suppressNextPush) {
    suppressNextPush = false;
    lastSnap = location;
    syncNativeRoute(location);
    return;
  }

  if (lastSnap !== null && lastSnap !== location) {
    navStack.push(lastSnap);
  }

  lastSnap = location;
  syncNativeRoute(location);
}

export function applyNav(location: string): void {
  suppressNextPush = true;
  appNavigate(location, { replace: true });
  lastSnap = location;
  syncNativeRoute(location);
}

/**
 * 나야나야 goBack 패턴 — 스택 pop → fallback → 홈이면 false
 * (오버레이는 SowonLottoWeb.onBack에서 먼저 처리)
 */
export function goBack(): boolean {
  if (navStack.length > 0) {
    applyNav(navStack.pop()!);
    return true;
  }

  const cur = lastSnap ?? "/";
  const pathname = cur.split("?")[0] || "/";
  if (pathname === "/") return false;

  const search = cur.includes("?") ? `?${cur.split("?")[1]}` : "";
  applyNav(resolveBackFallback(pathname, search));
  return true;
}

export function resetNavStackForTests(): void {
  navStack.length = 0;
  lastSnap = null;
  suppressNextPush = false;
}

declare global {
  interface Window {
    __sowonAtHome?: boolean;
    SowonLottoRoute?: {
      setPathname: (path: string) => void;
    };
  }
}
