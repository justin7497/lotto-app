import {
  fetchAdminEngagementCampaigns,
  resetAdminEngagementCampaigns,
  saveAdminEngagementCampaigns,
  type EngagementCampaignsResponse,
} from "@/utils/adminApi";
import {
  CAMPAIGN_SCHEDULE_OPTIONS,
  DEFAULT_ENGAGEMENT_CAMPAIGNS,
  DEFAULT_ENGAGEMENT_SETTINGS,
  type EngagementCampaign,
  type EngagementSettings,
} from "@/data/engagementCampaigns";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PageCard from "@/components/PageCard";

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR");
}

type AdminEngagementCampaignsProps = {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  variant?: "mobile" | "desktop";
};

export default function AdminEngagementCampaigns({
  onMessage,
  onError,
  variant = "mobile",
}: AdminEngagementCampaignsProps) {
  const [campaigns, setCampaigns] = useState<EngagementCampaign[]>(() =>
    DEFAULT_ENGAGEMENT_CAMPAIGNS.map((row) => ({ ...row })),
  );
  const [settings, setSettings] = useState<EngagementSettings>(DEFAULT_ENGAGEMENT_SETTINGS);
  const [source, setSource] = useState<EngagementCampaignsResponse["source"]>("default");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminEngagementCampaigns();
      setSource(data.source);
      setUpdatedAt(data.updatedAt);
      setUpdatedBy(data.updatedBy);
      setSettings(data.settings ?? DEFAULT_ENGAGEMENT_SETTINGS);
      if (data.campaigns && data.campaigns.length > 0) {
        setCampaigns(data.campaigns.map((row) => ({ ...row, enabled: row.enabled !== false })));
      } else {
        setCampaigns(DEFAULT_ENGAGEMENT_CAMPAIGNS.map((row) => ({ ...row })));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "알림 문구를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  function updateCampaign(index: number, patch: Partial<EngagementCampaign>) {
    setCampaigns((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveAdminEngagementCampaigns(campaigns, settings);
      onMessage("알림 문구·주기 설정을 저장했습니다.");
      await loadCampaigns();
    } catch (err) {
      onError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Firestore에 저장된 알림 설정을 삭제하고 기본값으로 되돌릴까요?")) return;
    setSaving(true);
    try {
      await resetAdminEngagementCampaigns();
      setCampaigns(DEFAULT_ENGAGEMENT_CAMPAIGNS.map((row) => ({ ...row })));
      setSettings(DEFAULT_ENGAGEMENT_SETTINGS);
      onMessage("기본 알림 설정으로 되돌렸습니다.");
      await loadCampaigns();
    } catch (err) {
      onError(err instanceof Error ? err.message : "되돌리기에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = campaigns.filter((row) => row.enabled !== false).length;

  return (
    <PageCard className={variant === "desktop" ? "admin-desktop-card" : undefined}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">알림 문구·주기</h3>
          <p className="text-xs text-gray-500 mt-1">
            {source === "remote" ? "Firestore 저장본" : "앱 기본값"} · 활성 {enabledCount}/
            {campaigns.length}개
            {updatedAt ? ` · ${formatDateTime(updatedAt)}` : ""}
            {updatedBy ? ` (${updatedBy})` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCampaigns()}
          disabled={loading}
          className="admin-icon-btn"
          aria-label="새로고침"
        >
          <RefreshCw className={`w-4 h-4${loading ? " animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 mb-4">
        <p className="text-sm font-bold text-gray-900">발송 주기 제한</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          기기당 7일 동안 보낼 수 있는 최대 푸시 횟수입니다. 우선순위가 높은 캠페인부터 1회 실행마다
          1건만 발송됩니다.
        </p>
        <label className="mt-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 shrink-0">주당 최대</span>
          <input
            type="number"
            min={1}
            max={7}
            value={settings.maxPushesPerWeek}
            onChange={(e) =>
              setSettings({
                maxPushesPerWeek: Math.min(7, Math.max(1, Number(e.target.value) || 1)),
              })
            }
            className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-base bg-white"
          />
          <span className="text-sm text-gray-600">회</span>
        </label>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign, index) => (
          <div
            key={campaign.id}
            className={`admin-campaign-card${variant === "desktop" ? " admin-campaign-card--desktop" : ""}`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{campaign.id}</p>
                <p className="text-xs text-gray-500">
                  우선순위 {campaign.priority} ·{" "}
                  {CAMPAIGN_SCHEDULE_OPTIONS.find((opt) => opt.value === campaign.schedule)?.label ??
                    campaign.schedule}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={campaign.enabled !== false}
                onClick={() => updateCampaign(index, { enabled: campaign.enabled === false })}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  campaign.enabled !== false ? "bg-[#127a6e]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    campaign.enabled !== false ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">제목</span>
                <input
                  value={campaign.title}
                  onChange={(e) => updateCampaign(index, { title: e.target.value })}
                  maxLength={80}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">내용</span>
                <textarea
                  value={campaign.body}
                  onChange={(e) => updateCampaign(index, { body: e.target.value })}
                  maxLength={160}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">발송 조건</span>
                  <select
                    value={campaign.schedule}
                    onChange={(e) =>
                      updateCampaign(index, {
                        schedule: e.target.value as EngagementCampaign["schedule"],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  >
                    {CAMPAIGN_SCHEDULE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">이동 경로</span>
                  <input
                    value={campaign.link}
                    onChange={(e) => updateCampaign(index, { link: e.target.value })}
                    placeholder="/generator"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">우선순위 (낮을수록 먼저)</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={campaign.priority}
                  onChange={(e) =>
                    updateCampaign(index, {
                      priority: Math.min(999, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-5">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="page-cta page-cta--teal w-full"
        >
          {saving ? "저장 중…" : "Firestore에 저장"}
        </button>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={saving || loading}
          className="page-cta page-cta--secondary w-full"
        >
          기본값으로 되돌리기
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        저장 후 GitHub Actions 스케줄(`notify-engagement`)과 추첨 후 발송이 이 설정을 사용합니다.
        같은 캠페인은 기기당 1회만 발송됩니다. 자동 발송은 Firestore `devices` 컬렉션에 등록된
        기기만 대상이며, 알림 테스트(내 계정)와 경로가 다를 수 있습니다.
      </p>
    </PageCard>
  );
}
