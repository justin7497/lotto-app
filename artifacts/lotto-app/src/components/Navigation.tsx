import { Link, useLocation } from "wouter";
import { BarChart3, Shuffle, LayoutDashboard, Star, Bookmark, Trophy, LogIn, LogOut, User } from "lucide-react";
import { useUser, useClerk, Show } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const isClerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "홈",     short: "홈" },
  { href: "/analysis", icon: BarChart3, label: "분석",  short: "분석" },
  { href: "/generator", icon: Shuffle, label: "번호생성", short: "생성" },
  { href: "/my-numbers", icon: Bookmark, label: "나의 번호", short: "내번호" },
  { href: "/backtest", icon: Trophy, label: "전략 검증", short: "검증" },
];

function AuthButton() {
  if (!isClerkEnabled) {
    return (
      <Link
        href="/sign-in"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        로그인
      </Link>
    );
  }

  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <Link
        href="/sign-in"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        로그인
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-in">
        <div className="flex items-center gap-2">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="프로필" className="w-7 h-7 rounded-full object-cover border border-amber-200" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-600" />
            </div>
          )}
          <span className="text-sm text-gray-600 hidden md:block max-w-[100px] truncate">
            {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "사용자"}
          </span>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          로그인
        </Link>
      </Show>
    </>
  );
}

function MobileAuthButton() {
  if (!isClerkEnabled) return null;

  const { signOut } = useClerk();
  const { isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <>
      <Show when="signed-in">
        <button
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-gray-400"
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-amber-500"
        >
          <LogIn className="w-5 h-5 stroke-amber-500" />
          로그인
        </Link>
      </Show>
    </>
  );
}

export default function Navigation() {
  const [location] = useLocation();
  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden sm:flex sticky top-0 z-50 bg-white border-b border-amber-100 shadow-sm">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">로또 분석</span>
          </div>
          <nav className="flex gap-1 items-center">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-amber-500 text-white"
                      : "text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <AuthButton />
          </nav>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-amber-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex">
          {NAV_ITEMS.map(({ href, short, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-amber-500" : "text-gray-400"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-amber-500" : ""}`} />
                {short}
              </Link>
            );
          })}
          <MobileAuthButton />
        </div>
      </nav>
    </>
  );
}
