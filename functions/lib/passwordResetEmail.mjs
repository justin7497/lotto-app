const PASSWORD_RESET_PAGE_URL = "https://lotto-app-ljh.web.app/reset-password";

export function buildDirectPasswordResetUrl(firebaseLink) {
  const source = new URL(firebaseLink);
  const oobCode = source.searchParams.get("oobCode");
  const apiKey = source.searchParams.get("apiKey");
  const mode = source.searchParams.get("mode") || "resetPassword";
  if (!oobCode) throw new Error("no_oob_code");

  const target = new URL(PASSWORD_RESET_PAGE_URL);
  target.searchParams.set("mode", mode);
  target.searchParams.set("oobCode", oobCode);
  if (apiKey) target.searchParams.set("apiKey", apiKey);
  return target.toString();
}

export function buildPasswordResetEmailHtml(resetUrl, appName = "로또킹") {
  return `<!DOCTYPE html>
<html lang="ko">
  <body style="margin:0;padding:24px;background:#fff7ed;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #fde68a;border-radius:16px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${appName} 비밀번호 재설정</h1>
      <p style="margin:0 0 16px;line-height:1.6;">비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.</p>
      <p style="margin:0 0 20px;">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#f59e0b;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;">비밀번호 재설정</a>
      </p>
      <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#4b5563;">버튼이 보이지 않으면 아래 링크를 복사해 브라우저에 붙여넣어 주세요.</p>
      <p style="margin:0 0 20px;word-break:break-all;font-size:13px;"><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="margin:0;line-height:1.6;font-size:14px;color:#6b7280;">본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.</p>
    </div>
  </body>
</html>`;
}
