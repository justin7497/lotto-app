/** 콤마로 구분된 관리자 이메일 (클라이언트 UI 게이트용 — 서버 ADMIN_EMAILS와 동일하게 맞출 것) */
function parseAdminEmails(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_EMAILS = parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS as string | undefined);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function hasAdminConfig(): boolean {
  return ADMIN_EMAILS.length > 0;
}
