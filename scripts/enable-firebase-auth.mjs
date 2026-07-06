/**
 * Firebase Authentication(이메일/비밀번호) 자동 활성화
 * 실행: node scripts/enable-firebase-auth.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PROJECT = "lotto-app-ljh";
const API_KEY = "AIzaSyA2kU0D3_kANAwtz5hrm-QnwfXQO7gdwxw";
const CONFIG_PATH = join(homedir(), ".config", "configstore", "firebase-tools.json");
const OAUTH_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const OAUTH_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const BILLING_ACCOUNT = "billingAccounts/01BBDF-8628DF-348D3D";

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

async function api(token, url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": PROJECT,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, text: await res.text() };
}

async function waitForBillingApi(token) {
  for (let i = 0; i < 12; i += 1) {
    const link = await api(
      token,
      `https://cloudbilling.googleapis.com/v1/projects/${PROJECT}/billingInfo`,
      "PUT",
      { billingAccountName: BILLING_ACCOUNT },
    );
    if (link.status === 200) return true;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

console.log(`프로젝트: ${PROJECT}\n`);
const token = await refreshAccessToken();
console.log("✓ 토큰 갱신 완료\n");

const billing = await api(
  token,
  `https://cloudbilling.googleapis.com/v1/projects/${PROJECT}/billingInfo`,
);
const billingData = JSON.parse(billing.text || "{}");

if (!billingData.billingEnabled) {
  console.log("1) Cloud Billing API 활성화...");
  await api(
    token,
    `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services/cloudbilling.googleapis.com:enable`,
    "POST",
    {},
  );
  console.log("2) Blaze 요금제 연결 중...");
  const linked = await waitForBillingApi(token);
  if (!linked) throw new Error("Blaze 요금제 연결 실패");
  console.log("   ✓ Blaze 연결 완료");
} else {
  console.log("1) Blaze 요금제 이미 연결됨");
}

await api(
  token,
  `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services/identitytoolkit.googleapis.com:enable`,
  "POST",
  {},
);
console.log("3) Identity Toolkit API 활성화");

const init = await api(
  token,
  `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/identityPlatform:initializeAuth`,
  "POST",
  {},
);
console.log("4) Auth 초기화:", init.status);

const patch = await api(
  token,
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
  "PATCH",
  { signIn: { email: { enabled: true, passwordRequired: true } } },
);
console.log("5) 이메일/비밀번호:", patch.status);

await api(
  token,
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=authorizedDomains`,
  "PATCH",
  {
    authorizedDomains: [
      "localhost",
      "lotto-app-ljh.web.app",
      "lotto-app-ljh.firebaseapp.com",
    ],
  },
);
console.log("6) 승인 도메인 설정 완료");

const testEmail = `test_${Date.now()}@example.com`;
const signup = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "testpass123",
      returnSecureToken: true,
    }),
  },
);
const signupText = await signup.text();
console.log("\n7) 가입 테스트:", signup.status);

if (signup.status === 200) {
  console.log("\n✅ Firebase Authentication 활성화 완료! 회원가입이 가능합니다.");
  process.exit(0);
}

console.log("\n❌ 가입 테스트 실패:", signupText.slice(0, 200));
process.exit(1);
