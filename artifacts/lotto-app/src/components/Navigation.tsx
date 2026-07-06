import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Crown,
  Sparkles,
  Shuffle,
  Layers,
  Heart,
  LogIn,
  LogOut,
  User,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "홈", short: "홈" },
  { href: "/lottoking", icon: Crown, label: "로또킹", short: "킹" },
  { href: "/saju", icon: Sparkles, label: "사주", short: "사주" },
  { href: "/generator", icon: Shuffle, label: "추천", short: "추천" },
  { href: "/extracted", icon: Layers, label: "추출번호", short: "추출" },
  { href: "/my-numbers", icon: Heart, label: "내번호", short: "내번호" },
];

function isActiveTab(location: string, href: string): boolean {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}

function AuthButton() {
  const { isSignedIn, isLoaded, user, signOut } = useAuth();

  if (!isLoaded) {
    return (
      <Link
        href="/sign-in"
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
      >
        <LogIn className="w-5 h-5" />
        <span className="hidden sm:inline">로그인</span>
      </Link>
    );
  }

  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in"
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
      >
        <LogIn className="w-5 h-5" />
        로그인
      </Link>
    );
  }

  const displayName = user?.email?.split("@")[0] ?? "사용자";

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
        <User className="w-5 h-5 text-amber-600" />
      </div>
      <span className="text-base text-gray-600 hidden md:block max-w-[100px] truncate">{displayName}</span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="hidden sm:inline">로그아웃</span>
      </button>
    </div>
  );
}

export default function Navigation() {
  const [location] = useLocation();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-amber-100 shadow-sm">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">로또 분석</span>
          </Link>
          <AuthButton />
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-amber-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto flex">
          {NAV_ITEMS.map(({ href, short, label, icon: Icon }) => {
            const active = isActiveTab(location, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 min-w-0 text-base font-semibold transition-colors ${
                  active ? "text-amber-500" : "text-gray-500"
                }`}
              >
                <Icon className={`w-7 h-7 shrink-0 ${active ? "stroke-amber-500 stroke-[2.5px]" : ""}`} />
                <span className="leading-none truncate max-w-full px-0.5 sm:hidden">{short}</span>
                <span className="leading-none truncate max-w-full px-0.5 hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
