import { useState } from "react";
import { Link } from "wouter";
import EngagementNotificationSettings from "@/components/EngagementNotificationSettings";
import {
  applyAppUpdate,
  dismissUpdatePrompt,
  getLocalBuildId,
  isUpdatePromptDismissed,
  shouldPromptForUpdate,
  type RemoteAppVersion,
} from "@/utils/appVersion";

function mockRemote(overrides: Partial<RemoteAppVersion> = {}): RemoteAppVersion {
  return {
    buildId: `${Date.now()}`,
    builtAt: new Date().toISOString(),
    label: "test",
    prompt: true,
    ...overrides,
  };
}

export default function AppUpdateTest() {
  const localBuildId = getLocalBuildId();
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<RemoteAppVersion | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast(`${type === "error" ? "오류" : "완료"}: ${message}`);
  };

  const runScenario = (remote: RemoteAppVersion) => {
    if (remote.buildId === localBuildId) {
      showToast("error", "로컬 buildId와 같아 업데이트 없음으로 처리됩니다.");
      return;
    }

    if (!shouldPromptForUpdate(remote)) {
      showToast("success", "조용한 업데이트 — 슬립이 아니면 즉시 reload 됩니다.");
      applyAppUpdate();
      return;
    }

    if (isUpdatePromptDismissed(remote.buildId)) {
      showToast("error", "이 buildId는 세션에서 '나중에'로 닫혀 팝업이 뜨지 않습니다.");
      return;
    }

    setPreview(remote);
  };

  if (!import.meta.env.DEV) {
    return (
      <div className="page-content">
        <p className="text-sm text-gray-500">개발 환경에서만 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="page-content page-content--loose">
      <h1 className="text-xl font-extrabold text-gray-900 mb-2">업데이트·알림 테스트</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        로컬 buildId: <code className="text-xs">{localBuildId}</code>
      </p>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-bold text-gray-900 mb-3">업데이트 시나리오</h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-xl bg-[#127a6e] px-4 py-3 text-sm font-bold text-white"
            onClick={() => runScenario(mockRemote({ prompt: true }))}
          >
            기능 배포 (팝업, prompt: true)
          </button>
          <button
            type="button"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800"
            onClick={() => runScenario(mockRemote({ prompt: false }))}
          >
            데이터 배포 (조용히, prompt: false)
          </button>
          <button
            type="button"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800"
            onClick={() => {
              const remote = mockRemote({ prompt: true });
              dismissUpdatePrompt(remote.buildId);
              showToast("success", `buildId ${remote.buildId.slice(0, 12)}… 세션 닫기 저장`);
            }}
          >
            「나중에」 세션 저장 시뮬레이션
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          슬립 작성 중 조용한 업데이트는{" "}
          <Link href="/slip" className="text-link-brand font-semibold">
            /slip
          </Link>
          에서 prompt:false 시나리오로 확인하세요.
        </p>
      </section>

      {preview ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-5"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-gray-900 text-center mb-2">앱 업데이트 (미리보기)</h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              remote buildId: {preview.buildId.slice(0, 20)}…
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={applyAppUpdate}
                className="rounded-xl bg-[#127a6e] py-3 text-white font-bold"
              >
                지금 업데이트
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissUpdatePrompt(preview.buildId);
                  setPreview(null);
                  showToast("success", "나중에 — 이 세션에서는 다시 안 뜹니다");
                }}
                className="rounded-xl border-2 border-gray-300 py-3 font-bold text-gray-800"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EngagementNotificationSettings onToast={showToast} />

      {toast ? (
        <p className="text-sm text-center text-emerald-600" role="status">
          {toast}
        </p>
      ) : null}

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/notification-settings" className="text-link-brand">
          실제 알림 설정 페이지
        </Link>
      </p>
    </div>
  );
}
