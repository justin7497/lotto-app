import type { ReactNode } from "react";
import { Loader2, LogIn, ShieldAlert } from "lucide-react";
import PageCard from "@/components/PageCard";
import { hasAdminConfig } from "@/config/admin";
import type { AdminPageState } from "@/hooks/useAdminPage";

type AdminGateProps = {
  admin: AdminPageState;
  variant?: "mobile" | "desktop";
  children: ReactNode;
};

export default function AdminGate({ admin, variant = "mobile", children }: AdminGateProps) {
  const wrapClass = variant === "desktop" ? "admin-desktop-gate" : "page-content";

  if (!admin.isLoaded) {
    return (
      <div className={`${wrapClass} flex items-center justify-center py-16 text-gray-500`}>
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!hasAdminConfig()) {
    return (
      <div className={wrapClass}>
        <PageCard>
          <div className="flex items-start gap-3 text-amber-800">
            <ShieldAlert className="w-6 h-6 shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-extrabold">관리자 설정 필요</h2>
              <p className="mt-2 text-sm leading-relaxed">
                빌드 환경 변수 <code>VITE_ADMIN_EMAILS</code>와 Functions{" "}
                <code>ADMIN_EMAILS</code>에 관리자 이메일을 설정한 뒤 다시 배포해 주세요.
              </p>
            </div>
          </div>
        </PageCard>
      </div>
    );
  }

  if (!admin.isSignedIn) {
    return (
      <div className={wrapClass}>
        <PageCard className={variant === "desktop" ? "admin-desktop-login-card" : undefined}>
          <div className="flex items-center gap-2 mb-4">
            <LogIn className="w-5 h-5 text-[#127a6e]" aria-hidden />
            <h2 className="text-lg font-extrabold text-gray-900">관리자 로그인</h2>
          </div>
          <form onSubmit={(e) => void admin.handleLogin(e)} className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">이메일</span>
              <input
                type="email"
                value={admin.loginEmail}
                onChange={(e) => admin.setLoginEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base"
                autoComplete="username"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">비밀번호</span>
              <input
                type="password"
                value={admin.loginPassword}
                onChange={(e) => admin.setLoginPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base"
                autoComplete="current-password"
                required
              />
            </label>
            {admin.loginError ? <p className="text-sm text-red-600">{admin.loginError}</p> : null}
            <button type="submit" disabled={admin.loginBusy} className="page-cta page-cta--teal w-full">
              {admin.loginBusy ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </PageCard>
      </div>
    );
  }

  if (!admin.isAdmin) {
    return (
      <div className={wrapClass}>
        <PageCard>
          <div className="flex items-start gap-3 text-red-700">
            <ShieldAlert className="w-6 h-6 shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-extrabold">접근 권한 없음</h2>
              <p className="mt-2 text-sm">
                {admin.user?.email ?? "현재 계정"}은 관리자로 등록되지 않았습니다.
              </p>
            </div>
          </div>
        </PageCard>
      </div>
    );
  }

  return <>{children}</>;
}
