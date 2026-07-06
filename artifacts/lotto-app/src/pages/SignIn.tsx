import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/utils/authErrors";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const inputClass =
  "w-full rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

export default function SignInPage() {
  const { signInWithEmail, isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) setLocation("/generator");
  }, [isSignedIn, setLocation]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      setLocation("/generator");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 py-10">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="relative w-full max-w-[460px] rounded-[1.75rem] border border-amber-200 bg-white/95 p-8 shadow-2xl shadow-amber-200/40 backdrop-blur">
        <div className="mb-6 text-center">
          <img
            src={`${basePath}/logo.png`}
            alt="로또킹"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-md"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">로그인</h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            이메일과 비밀번호로 로그인하세요
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!isLoaded ? "확인 중..." : loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          계정이 없으신가요?{" "}
          <Link href="/sign-up" className="font-semibold text-amber-600 hover:text-amber-700">
            회원가입
          </Link>
        </p>

        <Link
          href="/"
          className="mt-4 block text-center text-sm font-medium text-gray-400 hover:text-gray-600"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
