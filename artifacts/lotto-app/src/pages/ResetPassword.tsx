import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/utils/authErrors";
import { getAuthActionParams } from "@/utils/authActionParams";
import { useGoBack } from "@/hooks/useGoBack";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const inputClass =
  "w-full rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

export default function ResetPasswordPage() {
  const { completePasswordReset, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const goBack = useGoBack();
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [linkReady, setLinkReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { mode, oobCode: code } = getAuthActionParams();
    if (mode !== "resetPassword" || !code) {
      setError("비밀번호 재설정 링크가 올바르지 않습니다. 로그인 화면에서 다시 요청해 주세요.");
      return;
    }
    setOobCode(code);
    setLinkReady(true);
  }, []);

  async function handleContinue() {
    if (!oobCode) return;

    setVerifying(true);
    setError(null);
    try {
      const accountEmail = await completePasswordReset.verifyCode(oobCode);
      setEmail(accountEmail);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLinkReady(false);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!oobCode) return;

    setError(null);
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset.apply(oobCode, password);
      setSuccess(true);
      window.setTimeout(() => setLocation("/sign-in"), 2500);
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
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            {email
              ? `${email} 계정의 새 비밀번호를 입력하세요`
              : "비밀번호를 잊으셨다면 아래에서 새로 설정할 수 있습니다"}
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm font-medium text-[#127a6e]">
              비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.
            </p>
            <Link href="/sign-in" className="inline-block text-sm font-semibold text-amber-600 hover:text-amber-700">
              지금 로그인하기
            </Link>
          </div>
        ) : linkReady && !email ? (
          <div className="space-y-4">
            <p className="text-center text-sm leading-6 text-gray-600">
              본인이 비밀번호 재설정을 요청하셨다면 아래 버튼을 눌러 계속해 주세요.
            </p>
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={verifying || !isLoaded}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? "확인 중…" : "비밀번호 재설정 계속하기"}
            </button>
          </div>
        ) : email && oobCode ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-gray-700">
                새 비밀번호
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="new-password-confirm" className="mb-1.5 block text-sm font-semibold text-gray-700">
                새 비밀번호 확인
              </label>
              <input
                id="new-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 다시 입력"
                className={inputClass}
              />
            </div>

            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-200 transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "변경 중…" : "비밀번호 변경"}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Link href="/sign-in" className="inline-block text-sm font-semibold text-amber-600 hover:text-amber-700">
              로그인 화면으로
            </Link>
          </div>
        )}

        {!success && (
          <button
            type="button"
            onClick={goBack}
            className="mt-4 block w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600"
          >
            이전
          </button>
        )}
      </div>
    </div>
  );
}
