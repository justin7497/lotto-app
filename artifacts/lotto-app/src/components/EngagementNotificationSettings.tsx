import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Smartphone } from "lucide-react";
import {
  isPushSupported,
  registerDeviceEngagementPush,
  unregisterDeviceEngagementPush,
  subscribeForegroundMessages,
} from "@/lib/messaging";
import {
  isNativePushBridgeAvailable,
  nativePushPermissionHint,
  openNativeNotificationSettings,
  getNativePushPermissionState,
} from "@/utils/nativePushBridge";
import {
  loadEngagementSettings,
  saveEngagementSettingsLocal,
  setDeviceEngagementEnabled,
  type DeviceEngagementSettings,
} from "@/utils/deviceEngagement";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { loadEngagementCampaignsConfig } from "@/utils/engagementCampaignsConfig";

interface EngagementNotificationSettingsProps {
  onToast?: (type: "success" | "error", message: string) => void;
}

function permissionHint(): string | null {
  const nativeHint = nativePushPermissionHint();
  if (nativeHint) return nativeHint;
  if (isNativePushBridgeAvailable()) return null;
  if (typeof Notification === "undefined") return "이 브라우저는 알림을 지원하지 않습니다.";
  if (Notification.permission === "denied") {
    return "알림이 차단되어 있습니다. 브라우저·기기 설정에서 소원로또 알림을 허용해 주세요.";
  }
  return null;
}

export default function EngagementNotificationSettings({
  onToast,
}: EngagementNotificationSettingsProps) {
  const [settings, setSettings] = useState<DeviceEngagementSettings | null>(null);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState<string | null>(null);
  const [weeklyCap, setWeeklyCap] = useState(2);

  useEffect(() => {
    void isPushSupported().then(setPushAvailable);
    setSettings(loadEngagementSettings());
    setPermissionBlocked(permissionHint());
    void loadEngagementCampaignsConfig().then((config) => {
      setWeeklyCap(config.settings.maxPushesPerWeek);
    });
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    subscribeForegroundMessages((title, body) => {
      onToast?.("success", `${title} — ${body}`);
    }).then((cleanup) => {
      unsub = cleanup;
    });
    return () => unsub?.();
  }, [onToast]);

  const handleToggle = useCallback(async () => {
    if (!settings || saving) return;
    const next = !settings.engagementPushEnabled;
    const deviceId = getOrCreateDeviceId();
    setSaving(true);

    try {
      if (next) {
        if (pushAvailable) {
          const token = await registerDeviceEngagementPush();
          setPermissionBlocked(permissionHint());
          if (!token) {
            onToast?.("error", permissionHint() ?? "알림 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.");
            return;
          }
          onToast?.("success", "추첨·번호 안내 알림을 켰습니다");
        } else {
          await setDeviceEngagementEnabled(deviceId, true, null, false);
          onToast?.(
            "error",
            "이 브라우저에서는 푸시 수신이 제한됩니다. 설정만 저장했습니다.",
          );
        }
      } else {
        await unregisterDeviceEngagementPush();
        onToast?.("success", "추첨·번호 안내 알림을 껐습니다");
      }
    } catch {
      onToast?.("error", "알림 설정 저장에 실패했습니다");
    } finally {
      setSettings(loadEngagementSettings());
      setSaving(false);
    }
  }, [settings, saving, pushAvailable, onToast]);

  const handleResync = useCallback(async () => {
    if (!settings?.engagementPushEnabled) return;
    setSaving(true);
    try {
      const token = await registerDeviceEngagementPush();
      setPermissionBlocked(permissionHint());
      if (!token) {
        saveEngagementSettingsLocal({ engagementPushEnabled: false, optOut: false });
        onToast?.("error", permissionHint() ?? "푸시 토큰을 다시 등록하지 못했습니다");
        return;
      }
      onToast?.("success", "알림 토큰을 다시 등록했습니다");
    } finally {
      setSettings(loadEngagementSettings());
      setSaving(false);
    }
  }, [settings, onToast]);

  if (!settings) return null;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-extrabold text-gray-900 mb-3">추첨·번호 안내</h2>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3 min-w-0">
            <Smartphone className="w-5 h-5 text-[#127a6e] shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-gray-900">추첨·번호 안내 푸시</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                앱 설치 시 자동으로 켜집니다. 원하지 않으면 여기서 끌 수 있습니다.
              </p>
              {!pushAvailable && !isNativePushBridgeAvailable() ? (
                <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                  이 환경에서는 푸시 수신이 제한될 수 있습니다. 끄기/켜기는 이 기기에 저장됩니다.
                </p>
              ) : isNativePushBridgeAvailable() ? (
                <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                  앱 알림으로 추첨·번호 안내를 받을 수 있습니다.
                </p>
              ) : null}
              {permissionBlocked ? (
                <p className="text-sm text-red-600 mt-2 leading-relaxed">{permissionBlocked}</p>
              ) : isNativePushBridgeAvailable() &&
                getNativePushPermissionState() === "granted" ? (
                <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                  기기 알림 권한: 허용됨
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.engagementPushEnabled}
            disabled={saving}
            onClick={() => void handleToggle()}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors touch-manipulation ${
              settings.engagementPushEnabled ? "bg-[#127a6e]" : "bg-gray-300"
            } ${saving ? "opacity-60" : ""}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                settings.engagementPushEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 leading-relaxed">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
            <p>
              설치 다음 날 환영 안내, 3·7일 미사용 시 리마인드, 토요일 추첨 전·후 안내를 보냅니다.
              주당 최대 {weeklyCap}회까지 발송됩니다. 로그인 없이도 받을 수 있습니다.
            </p>
          </div>
          {settings.engagementPushEnabled && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleResync()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#127a6e]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                토큰 다시 등록
              </button>
              {isNativePushBridgeAvailable() ? (
                <button
                  type="button"
                  onClick={() => openNativeNotificationSettings()}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600"
                >
                  알림 설정 열기
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
