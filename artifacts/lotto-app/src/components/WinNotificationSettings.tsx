import { useCallback, useEffect, useState } from "react";
import { Bell, Mail, Smartphone, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/utils/notificationSettings";
import {
  isPushSupported,
  registerPushToken,
  unregisterPushTokens,
  subscribeForegroundMessages,
} from "@/lib/messaging";
import { AUTH_UI_VISIBLE } from "@/config/authUi";

const MIN_RANK_OPTIONS: Array<{ value: NotificationSettings["minRank"]; label: string }> = [
  { value: 5, label: "5등 이상 (3개 일치)" },
  { value: 4, label: "4등 이상" },
  { value: 3, label: "3등 이상" },
  { value: 2, label: "2등 이상" },
  { value: 1, label: "1등만" },
];

interface WinNotificationSettingsProps {
  onToast?: (type: "success" | "error", message: string) => void;
}

export default function WinNotificationSettings({ onToast }: WinNotificationSettingsProps) {
  const { user, isSignedIn } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);

  useEffect(() => {
    isPushSupported().then(setPushAvailable);
  }, []);

  useEffect(() => {
    if (!isSignedIn || !user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadNotificationSettings(user.uid)
      .then(setSettings)
      .finally(() => setLoading(false));
  }, [isSignedIn, user]);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let unsub: (() => void) | null = null;
    subscribeForegroundMessages((title, body) => {
      onToast?.("success", `${title} — ${body}`);
    }).then((cleanup) => {
      unsub = cleanup;
    });
    return () => unsub?.();
  }, [isSignedIn, onToast]);

  const persist = useCallback(
    async (next: Partial<NotificationSettings>) => {
      if (!user) return;
      setSaving(true);
      try {
        const saved = await saveNotificationSettings(user.uid, next);
        setSettings(saved);
      } catch {
        onToast?.("error", "알림 설정 저장에 실패했습니다");
      } finally {
        setSaving(false);
      }
    },
    [user, onToast],
  );

  const handleEmailToggle = useCallback(async () => {
    if (!settings || !user) return;
    const next = !settings.emailEnabled;
    await persist({ emailEnabled: next });
    onToast?.("success", next ? "당첨 시 이메일 알림을 켰습니다" : "이메일 알림을 껐습니다");
  }, [settings, user, persist, onToast]);

  const handlePushToggle = useCallback(async () => {
    if (!settings || !user) return;
    const next = !settings.pushEnabled;
    if (next) {
      if (!pushAvailable) {
        onToast?.("error", "브라우저 푸시가 지원되지 않습니다. VAPID 키 설정을 확인해 주세요.");
        return;
      }
      const token = await registerPushToken(user.uid);
      if (!token) {
        onToast?.("error", "알림 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.");
        return;
      }
    } else {
      await unregisterPushTokens(user.uid);
    }
    await persist({ pushEnabled: next });
    onToast?.("success", next ? "당첨 시 푸시 알림을 켰습니다" : "푸시 알림을 껐습니다");
  }, [settings, user, pushAvailable, persist, onToast]);

  const handleMinRankChange = useCallback(
    async (value: NotificationSettings["minRank"]) => {
      if (!settings) return;
      await persist({ minRank: value });
    },
    [settings, persist],
  );

  if (!isSignedIn) {
    if (!AUTH_UI_VISIBLE) return null;

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 mb-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-amber-900">당첨 알림</p>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              로그인하면 추첨 후 당첨 시 이메일·푸시 알림을 받을 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 mb-4 flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        알림 설정 불러오는 중...
      </div>
    );
  }

  const anyEnabled = settings.emailEnabled || settings.pushEnabled;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className={`w-5 h-5 ${anyEnabled ? "text-amber-500" : "text-gray-400"}`} />
        <span className="text-lg font-bold text-gray-900">당첨 알림</span>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />}
      </div>

      <p className="text-sm text-gray-500 mb-4 leading-relaxed break-words">
        매주 토요일 추첨 후, 저장한 번호가 당첨되면 알려드립니다.
        {user?.email ? (
          <span className="block sm:inline sm:ml-1 mt-0.5 sm:mt-0 text-gray-400 break-all">
            (이메일: {user.email})
          </span>
        ) : null}
      </p>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Mail className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">이메일 알림</p>
              <p className="text-sm text-gray-500">당첨 시 결과 메일 발송</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.emailEnabled}
            onChange={handleEmailToggle}
            disabled={saving}
            className="w-5 h-5 accent-amber-500 shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Smartphone className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">푸시 알림</p>
              <p className="text-sm text-gray-500 break-words">
                {pushAvailable ? "브라우저 알림으로 바로 확인" : "VAPID 키 설정 후 사용 가능"}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.pushEnabled}
            onChange={handlePushToggle}
            disabled={saving || !pushAvailable}
            className="w-5 h-5 accent-amber-500 shrink-0"
          />
        </label>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-2">알림 받을 등수</p>
          <select
            value={settings.minRank}
            onChange={(e) => handleMinRankChange(Number(e.target.value) as NotificationSettings["minRank"])}
            disabled={saving || !anyEnabled}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
          >
            {MIN_RANK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
