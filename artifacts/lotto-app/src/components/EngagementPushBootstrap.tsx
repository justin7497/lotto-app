import { useEffect } from "react";
import {
  isPushSupported,
  registerDeviceEngagementPush,
} from "@/lib/messaging";
import { isAppWebViewShell } from "@/utils/nativeQrBridge";
import { loadEngagementSettings, saveEngagementSettingsLocal } from "@/utils/deviceEngagement";

/** 앱 설치 사용자 — 별도 수신 동의 없이 푸시 토큰 자동 등록 (브라우저 권한만 요청) */
export default function EngagementPushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!(await isPushSupported())) return;
      if (loadEngagementSettings().optOut) return;

      const token = await registerDeviceEngagementPush();
      if (cancelled) return;

      if (!token && typeof Notification !== "undefined" && Notification.permission === "denied") {
        saveEngagementSettingsLocal({ engagementPushEnabled: false });
      }
    }

    const delayMs = isAppWebViewShell() ? 400 : 1200;
    const timer = window.setTimeout(() => {
      void bootstrap().catch(() => {});
    }, delayMs);

    function onPermissionGranted() {
      void bootstrap().catch(() => {});
    }
    window.addEventListener("sowon-push-permission-granted", onPermissionGranted);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("sowon-push-permission-granted", onPermissionGranted);
    };
  }, []);

  return null;
}
