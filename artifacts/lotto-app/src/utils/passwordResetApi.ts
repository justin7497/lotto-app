export type PasswordResetResult = {
  resetUrl?: string;
  emailed: boolean;
};

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/auth/password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    resetUrl?: string;
    emailed?: boolean;
  };

  if (!res.ok) {
    throw new Error(data.message || "비밀번호 재설정 요청에 실패했습니다.");
  }

  return {
    resetUrl: data.resetUrl,
    emailed: Boolean(data.emailed),
  };
}
