import { appPathname } from "@/utils/appNavigate";
import { goBack, recordRouteChange } from "@/utils/navStack";
import { dismissOverlayBack } from "@/utils/overlayBackStack";

/** 시스템·상단 뒤로가기 공통 진입점 (나야나야 SowonLottoWeb.onBack 패턴) */
export function onBack(): boolean {
  if (typeof window === "undefined") return false;
  if (dismissOverlayBack()) return true;
  return goBack();
}

export function bindNativeBackBridge(): void {
  if (typeof window === "undefined") return;

  const api = { onBack };
  window.SowonLottoWeb = api;
  // 이전 앱 버전 호환
  window.__sowonPerformBack = onBack;

  recordRouteChange(appPathname() + (window.location.search || ""));
}

declare global {
  interface Window {
    SowonLottoWeb?: {
      onBack: () => boolean;
    };
    __sowonPerformBack?: () => boolean;
  }
}
