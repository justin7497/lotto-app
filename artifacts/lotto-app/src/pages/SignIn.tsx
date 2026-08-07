import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/utils/authErrors";
import { syncUserCloudData } from "@/utils/userCloudSync";
import { useGoBack } from "@/hooks/useGoBack";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const inputClass =
  "w-full rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

export default function SignInPage() {
  const { signInWithEmail, requestPasswordReset, isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const goBack = useGoBack("/");
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [emailRequired, setEmailRequired] = useState(false);

  useEffect(() => {
    if (isSignedIn) setLocation("/");
  }, [isSignedIn, setLocation]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    setResetFeedback(null);
    setEmailRequired(false);
    try {
      await signInWithEmail(email, password);
      await syncUserCloudData();
      setLocation("/");
    } catch (err) {
      setLoginError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailRequired(true);
      setResetFeedback(null);
      setLoginError(null);
      emailRef.current?.focus();
      return;
    }

    setResetLoading(true);
    setLoginError(null);
    setResetFeedback(null);
    setEmailRequired(false);
    try {
      const result = await requestPasswordReset(trimmed);
      if (result.resetUrl) {
        const url = new URL(result.resetUrl);
        const base = basePath || "";
        const path = base && url.pathname.startsWith(base)
          ? url.pathname.slice(base.length) || "/"
          : url.pathname;
        setLocation(`${path}${url.search}`);
        return;
      }
      setResetFeedback("등록된 이메일이 아니거나 요청을 처리하지 못했습니다. 이메일 주소를 확인해 주세요.");
    } catch (err) {
      setResetFeedback(getAuthErrorMessage(err));
    } finally {
      setResetLoading(false);
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
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value.trim()) setEmailRequired(false);
              }}
              placeholder="example@email.com"
              className={`${inputClass} ${emailRequired ? "border-red-300 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-200" : ""}`}
              aria-invalid={emailRequired}
              aria-describedby={emailRequired ? "email-reset-hint" : undefined}
            />
            {emailRequired ? (
              <p id="email-reset-hint" className="mt-1.5 text-sm text-red-600">
                이메일을 먼저 입력해 주세요.
              </p>
            ) : null}
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

          {loginError ? <p className="text-center text-sm text-red-600">{loginError}</p> : null}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!isLoaded ? "확인 중..." : loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <section
          className="mt-4 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-4"
          aria-label="비밀번호 재설정"
        >
          <p className="text-center text-sm leading-6 text-gray-600">
            비밀번호를 잊으셨다면 이메일을 입력한 후 아래 버튼을 눌러 주세요.
          </p>
          <button
            type="button"
            onClick={() => void handleResetPassword()}
            disabled={resetLoading || loading || !isLoaded}
            className="mt-3 h-11 w-full rounded-xl border-2 border-amber-400 bg-white text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetLoading ? "준비 중…" : "비밀번호 재설정"}
          </button>
          {resetFeedback ? (
            <p
              className={`mt-3 text-center text-sm ${resetFeedback.includes("확인") ? "text-red-600" : "text-[#127a6e]"}`}
              role="status"
            >
              {resetFeedback}
            </p>
          ) : null}
        </section>

        <p className="mt-5 text-center text-sm text-gray-500">
          계정이 없으신가요?{" "}
          <Link href="/sign-up" className="font-semibold text-amber-600 hover:text-amber-700">
            회원가입
          </Link>
        </p>

        <button
          type="button"
          onClick={goBack}
          className="mt-4 block w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600"
        >
          이전
        </button>
      </div>
    </div>
  );
}
