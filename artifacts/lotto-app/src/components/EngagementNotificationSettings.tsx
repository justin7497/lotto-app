import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Smartphone } from "lucide-react";
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
} from "@/utils/nativePushBridge";
import {
  loadEngagementSettings,
  setDeviceEngagementEnabled,
  type DeviceEngagementSettings,
} from "@/utils/deviceEngagement";
import { getOrCreateDeviceId } from "@/utils/deviceId";

interface EngagementNotificationSettingsProps {
  onToast?: (type: "success" | "error", message: string) => void;
}

const GUIDE_ITEMS = [
  "토요일 추첨 전·후 안내",
  "행운·추첨 소식 안내",
  "발급완료 번호 당첨 결과",
] as const;

function permissionHint(): string | null {
  const nativeHint = nativePushPermissionHint();
  if (nativeHint) return nativeHint;
  if (isNativePushBridgeAvailable()) return null;
  if (typeof Notification === "undefined") return null;
  if (Notification.permission === "denied") {
    return "알림이 꺼져 있어요. 브라우저·기기 설정에서 허용해 주세요.";
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

  useEffect(() => {
    void isPushSupported().then(setPushAvailable);
    setSettings(loadEngagementSettings());
    setPermissionBlocked(permissionHint());
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
            onToast?.("error", permissionHint() ?? "알림 권한이 필요해요");
            return;
          }
          onToast?.("success", "알림을 켰어요");
        } else {
          await setDeviceEngagementEnabled(deviceId, true, null, false);
          onToast?.("error", "이 기기에서는 알림을 받기 어려워요");
        }
      } else {
        await unregisterDeviceEngagementPush();
        onToast?.("success", "알림을 껐어요");
      }
    } catch {
      onToast?.("error", "설정 저장에 실패했어요");
    } finally {
      setSettings(loadEngagementSettings());
      setSaving(false);
    }
  }, [settings, saving, pushAvailable, onToast]);

  if (!settings) return null;

  const enabled = settings.engagementPushEnabled;
  const showNativeSettings =
    isNativePushBridgeAvailable() && Boolean(permissionBlocked);

  return (
    <section className="notif-settings" aria-label="알림 설정">
      <div className="notif-settings__section-title notif-settings__section-title--reserved" aria-hidden="true" />

      <article className="notif-settings__card">
        <header className="notif-settings__header">
          <div className="notif-settings__header-main">
            <span className="notif-settings__icon" aria-hidden>
              <Smartphone className="w-5 h-5" />
            </span>
            <div className="notif-settings__header-copy">
              <h3 className="notif-settings__title">추첨·번호 안내</h3>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="추첨·번호 안내 알림"
            disabled={saving}
            onClick={() => void handleToggle()}
            className={`notif-settings__switch${enabled ? " notif-settings__switch--on" : ""}${saving ? " notif-settings__switch--busy" : ""}`}
          >
            <span className="notif-settings__switch-knob" />
          </button>
        </header>

        <div className="notif-settings__body">
          <p className="notif-settings__lead">이런 알림을 보내요</p>
          <ul className="notif-settings__guide">
            {GUIDE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="notif-settings__note">
            당첨되면 알림으로 알려 드려요. 지난 결과는{" "}
            <Link href="/win-notifications" className="notif-settings__link">
              당첨 확인
            </Link>
            메뉴에서 볼 수 있어요.
          </p>
          {permissionBlocked ? (
            <p className="notif-settings__alert" role="alert">
              {permissionBlocked}
            </p>
          ) : null}
        </div>

        {showNativeSettings ? (
          <footer className="notif-settings__actions">
            <button
              type="button"
              onClick={() => openNativeNotificationSettings()}
              className="notif-settings__action notif-settings__action--primary"
            >
              기기 알림 설정 열기
            </button>
          </footer>
        ) : null}
      </article>
    </section>
  );
}
