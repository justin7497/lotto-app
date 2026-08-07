type OverlayBackEntry = {
  id: number;
  onPop: () => void;
};

let stack: OverlayBackEntry[] = [];
let seq = 0;
let listening = false;
let suppressPopCount = 0;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (suppressPopCount > 0) {
      suppressPopCount -= 1;
      return;
    }
    const entry = stack.pop();
    entry?.onPop();
  });
}

function basePath(): string {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
}

/** 링크로 하위 페이지 이동 시 — history.back() 없이 오버레이 항목만 제거 */
export function consumeOverlayForNavigation(targetHref: string): void {
  if (stack.length === 0) return;
  stack.pop();
  const url = `${basePath()}${targetHref}`.replace(/\/{2,}/g, "/") || "/";
  window.history.replaceState(null, "", url);
}

/** 오버레이 열릴 때 history에 항목을 쌓고, 뒤로가기 시 onPop 호출 */
export function registerOverlayBack(onPop: () => void): () => void {
  ensureListener();
  const id = ++seq;
  window.history.pushState({ overlayBack: id }, "");
  const entry: OverlayBackEntry = { id, onPop };
  stack.push(entry);

  return () => {
    stack = stack.filter((e) => e.id !== id);
  };
}

/** 닫기 버튼 등 — history 한 단계 뒤로 (popstate → onPop) */
export function dismissOverlayBack(): boolean {
  if (stack.length === 0) return false;
  window.history.back();
  return true;
}

/** 저장·완료 등 프로그램 닫기 — 중첩 오버레이 스택·history를 한 번에 정리 (onPop 미호출) */
export function collapseOverlayHistory(): void {
  const depth = stack.length;
  if (depth === 0) return;
  stack = [];
  suppressPopCount = depth;
  window.history.go(-depth);
}

export function hasOverlayBackStack(): boolean {
  return stack.length > 0;
}

/** Android WebView 백키 — JS 스택이 있으면 먼저 닫기 */
export function bindNativeOverlayBackBridge(): void {
  if (typeof window === "undefined") return;
  window.__sowonDismissOverlay = () => {
    if (stack.length === 0) return false;
    dismissOverlayBack();
    return true;
  };
}

declare global {
  interface Window {
    __sowonDismissOverlay?: () => boolean;
  }
}
