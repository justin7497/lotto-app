/**
 * Firebase 비밀번호 재설정 이메일 템플릿을 한글로 설정합니다.
 * 실행: node scripts/update-password-reset-email-template.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PROJECT = "lotto-app-ljh";
const CONFIG_PATH = join(homedir(), ".config", "configstore", "firebase-tools.json");
const OAUTH_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const OAUTH_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

async function refreshAccessToken() {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const refreshToken = cfg.tokens?.refresh_token;
  if (!refreshToken) throw new Error("Firebase CLI 로그인 필요: firebase login");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`토큰 갱신 실패: ${JSON.stringify(data)}`);

  cfg.tokens.access_token = data.access_token;
  cfg.tokens.expires_at = Date.now() + (data.expires_in ?? 3600) * 1000;
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, "\t"));
  return data.access_token;
}

const resetPasswordTemplate = {
  subject: "로또킹 비밀번호 재설정 안내",
  body: `<p>안녕하세요.</p>
<p><strong>%APP_NAME%</strong> 계정(<strong>%EMAIL%</strong>)의 비밀번호 재설정을 요청하셨습니다.</p>
<p>아래 버튼을 눌러 새 비밀번호를 설정해 주세요.</p>
<p><a href="%LINK%" style="display:inline-block;padding:12px 20px;background:#f59e0b;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">비밀번호 재설정</a></p>
<p>버튼이 보이지 않으면 아래 링크를 복사해 브라우저에 붙여넣어 주세요.</p>
<p><a href="%LINK%">%LINK%</a></p>
<p>본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.</p>
<p>감사합니다.<br>%APP_NAME% 팀</p>`,
  bodyFormat: "HTML",
};

const updateMask = [
  "notification.sendEmail.resetPasswordTemplate.subject",
  "notification.sendEmail.resetPasswordTemplate.body",
  "notification.sendEmail.resetPasswordTemplate.bodyFormat",
].join(",");

const token = await refreshAccessToken();
const res = await fetch(
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=${encodeURIComponent(updateMask)}`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": PROJECT,
    },
    body: JSON.stringify({
      notification: {
        sendEmail: {
          resetPasswordTemplate,
        },
      },
    }),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error("템플릿 업데이트 실패:", res.status, text);
  process.exit(1);
}

console.log("✓ 비밀번호 재설정 이메일 템플릿을 한글로 설정했습니다.");
