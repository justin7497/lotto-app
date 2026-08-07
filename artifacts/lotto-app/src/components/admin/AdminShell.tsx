import {
  BarChart3,
  Bell,
  ExternalLink,
  Heart,
  Megaphone,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Link } from "wouter";
import AdminGate from "@/components/admin/AdminGate";
import AdminPanels from "@/components/admin/AdminPanels";
import { type AdminPageState, type AdminTab } from "@/hooks/useAdminPage";

const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: typeof BarChart3 }> = [
  { id: "stats", label: "기기·알림 점검", icon: BarChart3 },
  { id: "push", label: "알림 테스트", icon: Bell },
  { id: "campaigns", label: "알림 문구", icon: Megaphone },
  { id: "wishes", label: "소원 문구", icon: Heart },
];

type AdminShellProps = {
  admin: AdminPageState;
  variant: "mobile" | "desktop";
};

export default function AdminShell({ admin, variant }: AdminShellProps) {
  const isDesktop = variant === "desktop";

  return (
    <AdminGate admin={admin} variant={variant}>
      {isDesktop ? (
        <div className="admin-desktop-layout">
          <aside className="admin-desktop-sidebar">
            <div className="admin-desktop-sidebar__brand">
              <p className="admin-desktop-sidebar__title">소원로또 관리자</p>
              <p className="admin-desktop-sidebar__email">{admin.user?.email}</p>
            </div>

            <nav className="admin-desktop-nav" aria-label="관리자 메뉴">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = admin.tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-desktop-nav__item${active ? " admin-desktop-nav__item--active" : ""}`}
                    onClick={() => admin.setTab(item.id)}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="admin-desktop-sidebar__footer">
              <Link href="/admin" className="admin-desktop-sidebar__link">
                <Smartphone className="w-4 h-4" aria-hidden />
                모바일 화면
              </Link>
              <a href="/" className="admin-desktop-sidebar__link">
                <ExternalLink className="w-4 h-4" aria-hidden />
                앱으로 돌아가기
              </a>
            </div>
          </aside>

          <div className="admin-desktop-main">
            <header className="admin-desktop-header">
              <div>
                <h1 className="admin-desktop-header__title">
                  {NAV_ITEMS.find((item) => item.id === admin.tab)?.label ?? "관리자"}
                </h1>
                <p className="admin-desktop-header__sub">
                  {admin.tab === "stats"
                    ? "푸시 발송 가능 여부와 기기별 알림 이력을 점검합니다."
                    : "PC 전용 관리 화면 · 넓은 화면에 최적화되어 있습니다."}
                </p>
              </div>
              {(admin.message || admin.error) && (
                <p
                  className={`admin-desktop-toast${admin.error ? " admin-desktop-toast--error" : ""}`}
                  role="status"
                >
                  {admin.error ?? admin.message}
                </p>
              )}
            </header>

            <div className="admin-desktop-content">
              <AdminPanels admin={admin} variant="desktop" />
            </div>
          </div>
        </div>
      ) : (
        <div className="page-content pb-10">
          <div className="admin-mobile-topbar">
            <Link href="/admin/desktop" className="admin-mobile-desktop-link">
              <Monitor className="w-4 h-4" aria-hidden />
              PC 화면으로 보기
            </Link>
          </div>

          <div className="admin-tabs" role="tablist" aria-label="관리자 메뉴">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = admin.tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`admin-tab${active ? " admin-tab--active" : ""}`}
                  onClick={() => admin.setTab(item.id)}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>

          {(admin.error || admin.message) && (
            <p
              className={`text-sm text-center my-3 ${admin.error ? "text-red-600" : "text-emerald-600"}`}
              role="status"
            >
              {admin.error ?? admin.message}
            </p>
          )}

          <AdminPanels admin={admin} variant="mobile" />
        </div>
      )}
    </AdminGate>
  );
}
