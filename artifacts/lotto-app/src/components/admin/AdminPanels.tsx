import { Copy, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import PageCard from "@/components/PageCard";
import AdminEngagementCampaigns from "@/components/AdminEngagementCampaigns";
import { formatAdminDateTime, type AdminPageState } from "@/hooks/useAdminPage";
import {
  copyDeviceId,
  formatAdminPlatform,
  formatDeviceIdShort,
  formatDevicePushState,
  getDevicePushState,
  parseUserAgentSummary,
} from "@/utils/adminDeviceFormat";
import { getOrCreateDeviceId } from "@/utils/deviceId";

type AdminPanelsProps = {
  admin: AdminPageState;
  variant?: "mobile" | "desktop";
};

export default function AdminPanels({ admin, variant = "mobile" }: AdminPanelsProps) {
  const isDesktop = variant === "desktop";
  const [copiedDeviceId, setCopiedDeviceId] = useState<string | null>(null);

  async function handleCopyDeviceId(deviceId: string) {
    const ok = await copyDeviceId(deviceId);
    if (!ok) return;
    setCopiedDeviceId(deviceId);
    window.setTimeout(() => setCopiedDeviceId((current) => (current === deviceId ? null : current)), 1600);
  }

  if (admin.tab === "stats") {
    return (
      <PageCard className={isDesktop ? "admin-desktop-card" : undefined}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">기기·알림 점검</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              자동 알림 대상 기기와 발송 가능 상태를 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void admin.loadStats()}
            disabled={admin.statsLoading}
            className="admin-icon-btn"
            aria-label="새로고침"
          >
            <RefreshCw className={`w-4 h-4${admin.statsLoading ? " animate-spin" : ""}`} />
          </button>
        </div>

        {admin.statsLoading && !admin.stats ? (
          <p className="text-sm text-gray-500 text-center py-8">불러오는 중…</p>
        ) : admin.stats ? (
          <>
            <div className={`admin-stat-grid${isDesktop ? " admin-stat-grid--desktop" : ""}`}>
              <div className="admin-stat-card">
                <p className="admin-stat-card__label">등록 기기</p>
                <p className="admin-stat-card__value">
                  {admin.stats.devices.total.toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="admin-stat-card admin-stat-card--ok">
                <p className="admin-stat-card__label">발송 가능</p>
                <p className="admin-stat-card__value">
                  {admin.stats.devices.pushReady.toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="admin-stat-card admin-stat-card--warn">
                <p className="admin-stat-card__label">토큰 없음</p>
                <p className="admin-stat-card__value">
                  {admin.stats.devices.noToken.toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-card__label">푸시 거부</p>
                <p className="admin-stat-card__value">
                  {admin.stats.devices.optOut.toLocaleString("ko-KR")}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              기준 {formatAdminDateTime(admin.stats.generatedAt)} · 로그인 연동{" "}
              {admin.stats.devices.linked.toLocaleString("ko-KR")}대 · 가입 사용자{" "}
              {admin.stats.users.total.toLocaleString("ko-KR")}명 · 로그인 푸시 토큰{" "}
              {admin.stats.users.withPushTokens.toLocaleString("ko-KR")}개
            </p>

            <div className="admin-device-help mt-4">
              <p className="text-xs font-bold text-gray-700">점검 가이드</p>
              <ul className="admin-device-help__list text-xs text-gray-500 mt-1 leading-relaxed">
                <li>
                  <strong>발송 가능</strong> — FCM 토큰 있음 + 푸시 허용 (자동 알림 대상)
                </li>
                <li>
                  <strong>토큰 없음</strong> — 앱에서 「이 기기 알림 등록」 필요
                </li>
                <li>
                  <strong>마지막 자동 알림</strong> — engagement 캠페인 발송 이력 (dry-run 제외)
                </li>
              </ul>
            </div>

            <h4 className="text-sm font-extrabold text-gray-800 mt-5 mb-2">
              기기 목록 ({admin.stats.recentDevices.length}대)
            </h4>
            <ul className={`admin-device-list${isDesktop ? " admin-device-list--desktop" : ""}`}>
              {admin.stats.recentDevices.map((device) => {
                const pushState = getDevicePushState(device);
                const pushBadge = formatDevicePushState(pushState);
                const clientSummary = parseUserAgentSummary(device.userAgent);
                return (
                  <li key={device.id} className="admin-device-list__row">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="text-sm font-bold text-gray-900 font-mono truncate"
                          title={device.id}
                        >
                          {formatDeviceIdShort(device.id)}
                        </p>
                        <button
                          type="button"
                          className="admin-device-copy"
                          onClick={() => void handleCopyDeviceId(device.id)}
                          aria-label="기기 ID 복사"
                          title={device.id}
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden />
                          {copiedDeviceId === device.id ? (
                            <span className="admin-device-copy__label">복사됨</span>
                          ) : null}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        최근 {formatAdminDateTime(device.lastActiveAt)} ·{" "}
                        {formatAdminPlatform(device.platform)}
                        {clientSummary ? ` · ${clientSummary}` : ""}
                      </p>
                      {device.lastEngagement ? (
                        <p
                          className={`text-xs mt-0.5 ${device.lastEngagement.success ? "text-gray-600" : "text-amber-700"}`}
                        >
                          마지막 자동 알림 {device.lastEngagement.campaignId} ·{" "}
                          {formatAdminDateTime(device.lastEngagement.sentAt)}
                          {device.lastEngagement.success ? "" : " (실패)"}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">자동 알림 이력 없음</p>
                      )}
                      {device.linkedEmail ? (
                        <p className="text-xs text-teal-700 font-semibold mt-0.5 truncate">
                          연동 {device.linkedEmail}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">비로그인 기기</p>
                      )}
                    </div>
                    <div className="admin-device-list__actions">
                      <span className={`admin-device-badge ${pushBadge.badgeClass}`}>
                        {pushBadge.label}
                      </span>
                      <button
                        type="button"
                        className="admin-device-test-btn"
                        onClick={() => admin.openPushTestForDevice(device.id)}
                        disabled={!device.hasFcmToken}
                        title={
                          device.hasFcmToken
                            ? "알림 테스트 탭에서 이 기기로 발송"
                            : "FCM 토큰이 없어 테스트할 수 없습니다"
                        }
                      >
                        테스트
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">데이터가 없습니다.</p>
        )}
      </PageCard>
    );
  }

  if (admin.tab === "push") {
    return (
      <PageCard className={isDesktop ? "admin-desktop-card" : undefined}>
        <h3 className="text-base font-extrabold text-gray-900 mb-4">알림 테스트 발송</h3>

        <div className={`admin-push-status mb-4${isDesktop ? " admin-push-status--desktop" : ""}`}>
          <p className="text-sm font-bold text-gray-900">이 기기 상태</p>
          <p className="text-xs text-gray-500 mt-1 break-all">
            기기 ID: {admin.pushStatus?.deviceId ?? getOrCreateDeviceId()}
          </p>
          <ul className="admin-push-status__list">
            <li>
              알림 권한:{" "}
              <strong>
                {admin.pushStatus?.permission === "granted"
                  ? "허용"
                  : admin.pushStatus?.permission === "denied"
                    ? "차단"
                    : admin.pushStatus?.permission === "unsupported"
                      ? "미지원"
                      : "확인 필요"}
              </strong>
            </li>
            <li>
              기기 토큰:{" "}
              <strong>{admin.pushStatus?.engagementRegistered ? "등록됨" : "없음"}</strong>
            </li>
            <li>
              계정 토큰:{" "}
              <strong>{admin.pushStatus?.userTokenRegistered ? "등록됨" : "없음"}</strong>
            </li>
            {admin.pushStatus?.nativeApp ? <li>앱: Android 앱(WebView)</li> : null}
          </ul>
          {admin.pushStatus?.hint ? (
            <p className="text-xs text-amber-700 mt-2">{admin.pushStatus.hint}</p>
          ) : null}
          {admin.pushTargets ? (
            <p className="text-xs text-gray-600 mt-2">
              계정에 등록된 발송 대상: <strong>{admin.pushTargets.tokenCount}개 토큰</strong>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void admin.refreshPushStatus()}
            disabled={admin.pushRegistering}
            className={`page-cta page-cta--secondary mt-3${isDesktop ? " admin-desktop-btn-inline" : " w-full"}`}
          >
            {admin.pushRegistering ? "등록 중…" : "이 기기 알림 등록"}
          </button>
        </div>

        <div className={`space-y-3${isDesktop ? " admin-desktop-form-grid" : ""}`}>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">발송 대상</span>
            <select
              value={admin.pushChannel}
              onChange={(e) => admin.setPushChannel(e.target.value as typeof admin.pushChannel)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base bg-white"
            >
              <option value="self">내 계정 (로그인 토큰 + 연동 기기)</option>
              <option value="device">특정 기기 ID</option>
              <option value="engagement-all">전체 기기 (푸시 허용)</option>
            </select>
          </label>

          {admin.pushChannel === "device" ? (
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">기기 선택</span>
              <select
                value={admin.pushDeviceId}
                onChange={(e) => admin.setPushDeviceId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
              >
                {(admin.stats?.recentDevices ?? []).map((device) => (
                  <option key={device.id} value={device.id}>
                    {formatAdminPlatform(device.platform)} · {formatDeviceIdShort(device.id)}
                    {device.pushReady ? " · 발송 가능" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {admin.pushDeliveries && admin.pushDeliveries.length > 0 ? (
            <ul className="text-xs text-gray-600 space-y-1 rounded-xl bg-gray-50 p-3 md:col-span-2">
              {admin.pushDeliveries.map((row) => (
                <li key={`${row.deviceId ?? row.source}-${row.platform}`}>
                  {row.ok ? "✓" : "✗"} {row.platform ?? "unknown"}
                  {row.deviceId ? ` · ${row.deviceId.slice(0, 18)}…` : ""}
                  {row.error ? ` — ${row.error}` : ""}
                </li>
              ))}
            </ul>
          ) : null}

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">제목</span>
            <input
              value={admin.pushTitle}
              onChange={(e) => admin.setPushTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">내용</span>
            <textarea
              value={admin.pushBody}
              onChange={(e) => admin.setPushBody(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">이동 경로</span>
            <input
              value={admin.pushLink}
              onChange={(e) => admin.setPushLink(e.target.value)}
              placeholder="/generator"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void admin.handleSendTestPush()}
          disabled={admin.pushSending}
          className={`page-cta page-cta--teal mt-4 inline-flex items-center justify-center gap-2${isDesktop ? " admin-desktop-btn-inline" : " w-full"}`}
        >
          <Send className="w-4 h-4" aria-hidden />
          {admin.pushSending ? "발송 중…" : "테스트 푸시 보내기"}
        </button>
      </PageCard>
    );
  }

  if (admin.tab === "campaigns") {
    return (
      <AdminEngagementCampaigns
        variant={variant}
        onMessage={(text) => admin.setMessage(text)}
        onError={(text) => admin.setError(text)}
      />
    );
  }

  return (
    <PageCard className={isDesktop ? "admin-desktop-card" : undefined}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">확언 문구 관리</h3>
          <p className="text-xs text-gray-500 mt-1">
            {admin.wishSource === "remote" ? "Firestore 저장본" : "앱 기본 문구"} · 총{" "}
            {admin.phraseTotal}개
            {admin.wishUpdatedAt ? ` · ${formatAdminDateTime(admin.wishUpdatedAt)}` : ""}
            {admin.wishUpdatedBy ? ` (${admin.wishUpdatedBy})` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void admin.loadWishPhrases()}
          disabled={admin.wishLoading}
          className="admin-icon-btn"
          aria-label="새로고침"
        >
          <RefreshCw className={`w-4 h-4${admin.wishLoading ? " animate-spin" : ""}`} />
        </button>
      </div>

      <div className={`${isDesktop ? "admin-desktop-wishes" : ""}`}>
        <div className="wish-category-chips mb-3" role="tablist" aria-label="소원 카테고리">
          {admin.wishCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={admin.activeCategoryId === category.id}
              onClick={() => admin.setActiveCategoryId(category.id)}
              className={`wish-category-chip${admin.activeCategoryId === category.id ? " wish-category-chip--active" : ""}`}
            >
              <span aria-hidden>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {admin.activeCategory ? (
          <div className="admin-phrase-editor">
            <ul className={`admin-phrase-list${isDesktop ? " admin-phrase-list--desktop" : ""}`}>
              {admin.activeCategory.phrases.map((phrase, index) => (
                <li key={`${admin.activeCategory!.id}-${index}`} className="admin-phrase-list__row">
                  <input
                    value={phrase}
                    onChange={(e) =>
                      admin.updateActivePhrases((phrases) => {
                        phrases[index] = e.target.value;
                        return phrases;
                      })
                    }
                    className="admin-phrase-list__input"
                  />
                  <button
                    type="button"
                    className="admin-phrase-list__delete"
                    onClick={() =>
                      admin.updateActivePhrases((phrases) => phrases.filter((_, i) => i !== index))
                    }
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 mt-3">
              <input
                value={admin.newPhrase}
                onChange={(e) => admin.setNewPhrase(e.target.value)}
                placeholder="새 문구 추가"
                maxLength={120}
                className="admin-phrase-list__input flex-1"
              />
              <button
                type="button"
                className="page-cta page-cta--secondary !px-3"
                onClick={() => {
                  const text = admin.newPhrase.trim();
                  if (!text) return;
                  admin.updateActivePhrases((phrases) => [...phrases, text]);
                  admin.setNewPhrase("");
                }}
              >
                추가
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className={`flex gap-2 mt-5${isDesktop ? "" : " flex-col"}`}>
        <button
          type="button"
          onClick={() => void admin.handleSaveWishPhrases()}
          disabled={admin.wishSaving}
          className={`page-cta page-cta--teal${isDesktop ? " admin-desktop-btn-inline" : " w-full"}`}
        >
          {admin.wishSaving ? "저장 중…" : "Firestore에 저장"}
        </button>
        <button
          type="button"
          onClick={() => void admin.handleResetWishPhrases()}
          disabled={admin.wishSaving}
          className={`page-cta page-cta--secondary${isDesktop ? " admin-desktop-btn-inline" : " w-full"}`}
        >
          기본 문구로 되돌리기
        </button>
      </div>
    </PageCard>
  );
}
