/**
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseAdminEmails(raw) {
  return String(raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {import('firebase-admin/auth').Auth} auth
 * @param {import('firebase-functions/v2/https').Request} req
 * @param {string} adminEmailsRaw
 */
export async function verifyAdminRequest(req, auth, adminEmailsRaw) {
  const header = String(req.headers.authorization ?? "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, status: 401, message: "로그인이 필요합니다." };
  }

  const adminEmails = parseAdminEmails(adminEmailsRaw);
  if (adminEmails.length === 0) {
    return { ok: false, status: 503, message: "관리자 이메일(ADMIN_EMAILS)이 설정되지 않았습니다." };
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return { ok: false, status: 401, message: "인증 토큰이 유효하지 않습니다." };
  }

  const email = String(decoded.email ?? "").toLowerCase();
  if (!email || !adminEmails.includes(email)) {
    return { ok: false, status: 403, message: "관리자 권한이 없습니다." };
  }

  return { ok: true, uid: decoded.uid, email };
}
