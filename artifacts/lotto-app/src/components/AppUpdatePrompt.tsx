import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import {
  applyAppUpdate,
  checkForAppUpdate,
  dismissUpdatePrompt,
  isSlipRoute,
  isUpdatePromptDismissed,
  shouldPromptForUpdate,
  type AppUpdateInfo,
} from "@/utils/appVersion";

export default function AppUpdatePrompt() {
  const [location] = useLocation();
  const pathname = location.split("?")[0];
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const pendingSilentRef = useRef<AppUpdateInfo | null>(null);
  const dismiss = useOverlayBack(Boolean(update), () => {
    if (update) dismissUpdatePrompt(update.id);
    setUpdate(null);
  });

  useEffect(() => {
    let cancelled = false;

    async function runCheck() {
      const remote = await checkForAppUpdate();
      if (cancelled || !remote) return;

      if (!shouldPromptForUpdate(remote)) {
        if (isSlipRoute(pathname)) {
          pendingSilentRef.current = remote;
          return;
        }
        applyAppUpdate(remote);
        return;
      }

      if (isUpdatePromptDismissed(remote.id)) return;
      setUpdate(remote);
    }

    void runCheck();
    const retryTimer = window.setTimeout(() => {
      if (!cancelled) void runCheck();
    }, 1200);

    const onVisible = () => {
      if (document.visibilityState === "visible") void runCheck();
    };
    const onNativePlayUpdate = () => {
      void runCheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("sowon-play-update-available", onNativePlayUpdate);

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("sowon-play-update-available", onNativePlayUpdate);
    };
  }, [pathname]);

  useEffect(() => {
    const pending = pendingSilentRef.current;
    if (!pending || isSlipRoute(pathname)) return;
    pendingSilentRef.current = null;
    applyAppUpdate(pending);
  }, [pathname]);

  if (!update) return null;

  const isPlayStore = update.kind === "play-store";
  const portalRoot = document.getElementById("app-frame") ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-5"
      role="dialog"
      aria-modal
      aria-labelledby="app-update-title"
    >
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#127a6e]/10 text-[#127a6e]">
          <Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden />
        </div>
        <h2 id="app-update-title" className="text-xl font-extrabold text-gray-900 text-center mb-2">
          {isPlayStore ? "새 버전 업데이트" : "앱 업데이트"}
        </h2>
        <p className="text-base text-gray-600 text-center leading-relaxed mb-6">
          {isPlayStore ? (
            <>
              Play 스토어에 새 버전
              {update.versionName ? ` (${update.versionName})` : ""}이 올라왔습니다.
              <br />
              업데이트 후 이용해 주세요.
            </>
          ) : (
            <>
              새로운 기능과 개선 사항이 있습니다.
              <br />
              업데이트 후 이용해 주세요.
            </>
          )}
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => applyAppUpdate(update)}
            className="w-full rounded-xl bg-[#127a6e] text-white text-lg font-bold py-4 hover:bg-[#0f665c]"
          >
            {isPlayStore ? "지금 업데이트" : "지금 업데이트"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl border-2 border-gray-300 bg-white text-gray-800 text-lg font-bold py-4 hover:bg-gray-50"
          >
            나중에
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
