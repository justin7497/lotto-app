import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import {
  applyAppUpdate,
  checkAppUpdateAvailable,
  type RemoteAppVersion,
} from "@/utils/appVersion";

export default function AppUpdatePrompt() {
  const [update, setUpdate] = useState<RemoteAppVersion | null>(null);
  const dismiss = useOverlayBack(Boolean(update), () => setUpdate(null));

  useEffect(() => {
    let cancelled = false;

    async function runCheck() {
      const remote = await checkAppUpdateAvailable();
      if (!cancelled && remote) setUpdate(remote);
    }

    void runCheck();

    const onVisible = () => {
      if (document.visibilityState === "visible") void runCheck();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!update) return null;

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
          앱 업데이트
        </h2>
        <p className="text-base text-gray-600 text-center leading-relaxed mb-6">
          새로운 기능과 개선 사항이 있습니다.
          <br />
          업데이트 후 이용해 주세요.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={applyAppUpdate}
            className="w-full rounded-xl bg-[#127a6e] text-white text-lg font-bold py-4 hover:bg-[#0f665c]"
          >
            지금 업데이트
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
