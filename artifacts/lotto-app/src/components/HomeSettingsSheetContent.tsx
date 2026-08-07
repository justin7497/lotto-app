import { useMemo, useState } from "react";
import { CloudDownload, KeyRound, LogOut, MailCheck, UserCheck } from "lucide-react";
import AccountDeleteDialog from "@/components/AccountDeleteDialog";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import CoreHighlightsSheet from "@/components/CoreHighlightsSheet";
import HomeSheetMenuTile, { type HomeSheetAction } from "@/components/HomeSheetMenuTile";
import { useAuth } from "@/context/AuthContext";
import { useHomeTheme } from "@/context/HomeThemeContext";
import { buildCoreHighlightDetails } from "@/data/coreHighlightsData";
import type { HomeSubMenuItem } from "@/data/homeMenuData";
import { homeThemeAssets } from "@/data/homeThemes";
import { getAuthErrorMessage } from "@/utils/authErrors";
import { syncUserCloudData } from "@/utils/userCloudSync";
import { AUTH_UI_VISIBLE } from "@/config/authUi";

function SettingsItemsGrid({
  items,
  onNavigate,
  onSheetOpen,
}: {
  items: HomeSubMenuItem[];
  onNavigate?: () => void;
  onSheetOpen?: (sheet: HomeSheetAction) => void;
}) {
  return (
    <ul className="home-category-sheet__grid home-category-sheet__grid--dense">
      {items.map((item) => (
        <li key={item.label}>
          <HomeSheetMenuTile item={item} onNavigate={onNavigate} onSheetOpen={onSheetOpen} />
        </li>
      ))}
    </ul>
  );
}

export default function HomeSettingsSheetContent({ onClose }: { onClose: () => void }) {
  const { isSignedIn, isLoaded, user, signOut, deleteAccount, changePassword, sendVerificationEmail } = useAuth();
  const { themeId, settingsGuestItems, settingsSignedInItems } = useHomeTheme();
  const coreHighlightDetails = useMemo(
    () => buildCoreHighlightDetails(homeThemeAssets(themeId)),
    [themeId],
  );
  const [coreHighlightsOpen, setCoreHighlightsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setStatus(null);
    try {
      const result = await syncUserCloudData();
      setStatus(
        `동기화 완료 — 저장번호 ${result.savedCount}건, 단골 ${result.favoriteCount}건` +
          (result.restored > 0 ? ` (복구 ${result.restored}건)` : "") +
          (result.printDoneRestored > 0 ? `, 출력완료 ${result.printDoneRestored}건` : "") +
          (result.winHistoryRestored > 0
            ? `, 당첨현황 ${result.winHistoryRestored}건`
            : ""),
      );
    } catch (err) {
      setStatus(getAuthErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setStatus(null);
    try {
      await signOut();
      setStatus("로그아웃되었습니다.");
    } catch (err) {
      setStatus(getAuthErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount(password: string) {
    try {
      await deleteAccount(password);
      setDeleteOpen(false);
      setStatus("회원 탈퇴가 완료되었습니다.");
    } catch (err) {
      throw new Error(getAuthErrorMessage(err));
    }
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordOpen(false);
      setStatus("비밀번호가 변경되었습니다.");
    } catch (err) {
      throw new Error(getAuthErrorMessage(err));
    }
  }

  async function handleResendVerification() {
    setVerifyingEmail(true);
    setStatus(null);
    try {
      await sendVerificationEmail();
      setStatus("가입 확인 메일을 다시 보냈습니다.");
    } catch (err) {
      setStatus(getAuthErrorMessage(err));
    } finally {
      setVerifyingEmail(false);
    }
  }

  if (!isLoaded) {
    return <p className="home-settings-sheet__loading">계정 정보 불러오는 중…</p>;
  }

  function handleSheetOpen(sheet: HomeSheetAction) {
    if (sheet === "core-highlights") setCoreHighlightsOpen(true);
  }

  if (!isSignedIn || !AUTH_UI_VISIBLE) {
    return (
      <>
        <SettingsItemsGrid
          items={settingsGuestItems}
          onNavigate={onClose}
          onSheetOpen={handleSheetOpen}
        />
        <CoreHighlightsSheet
          open={coreHighlightsOpen}
          details={coreHighlightDetails}
          onClose={() => setCoreHighlightsOpen(false)}
        />
        <footer className="home-settings-footer">
          <p className="home-settings-footer__hint">
            {AUTH_UI_VISIBLE
              ? "로그인하지 않아도 번호 만들기·저장·QR 구매가 가능합니다. 로그인하면 저장 번호 백업과 당첨 알림을 받을 수 있습니다."
              : "번호 만들기·저장·QR 구매는 이 기기에 저장됩니다."}
          </p>
        </footer>
      </>
    );
  }

  return (
    <>
      <section className="home-settings-account" aria-label="로그인 계정">
        <div className="home-settings-account__row">
          <UserCheck className="w-9 h-9 shrink-0 text-[#127a6e]" strokeWidth={2} />
          <div className="min-w-0">
            <p className="home-settings-account__label">로그인 중</p>
            <p className="home-settings-account__email">{user?.email}</p>
            <p className="home-settings-account__verify">
              {user?.emailVerified ? "이메일 인증 완료" : "이메일 인증 대기"}
            </p>
          </div>
        </div>
        {!user?.emailVerified ? (
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={verifyingEmail}
            className="home-settings-account__verify-btn"
          >
            <MailCheck className="h-4 w-4" />
            {verifyingEmail ? "메일 발송 중…" : "가입 확인 메일 다시 보내기"}
          </button>
        ) : null}
      </section>

      <SettingsItemsGrid
        items={settingsSignedInItems}
        onNavigate={onClose}
        onSheetOpen={handleSheetOpen}
      />
      <CoreHighlightsSheet
        open={coreHighlightsOpen}
        details={coreHighlightDetails}
        onClose={() => setCoreHighlightsOpen(false)}
      />

      <footer className="home-settings-footer">
        <div className="home-settings-footer__actions">
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="home-settings-footer__btn"
          >
            <KeyRound className="w-5 h-5" />
            비밀번호 변경
          </button>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="home-settings-footer__btn"
          >
            <CloudDownload className="w-5 h-5" />
            {syncing ? "동기화 중…" : "클라우드에서 다시 불러오기"}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="home-settings-footer__btn"
          >
            <LogOut className="w-5 h-5" />
            {signingOut ? "로그아웃 중…" : "로그아웃"}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="home-settings-footer__btn home-settings-footer__btn--danger"
          >
            회원 탈퇴
          </button>
        </div>

        {status ? (
          <p className="home-settings-footer__status" role="status">
            {status}
          </p>
        ) : null}
      </footer>

      {user?.email ? (
        <>
          <ChangePasswordDialog
            open={passwordOpen}
            email={user.email}
            onCancel={() => setPasswordOpen(false)}
            onConfirm={handleChangePassword}
          />
          <AccountDeleteDialog
            open={deleteOpen}
            email={user.email}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleDeleteAccount}
          />
        </>
      ) : null}
    </>
  );
}
