/**
 * Google Maps JavaScript API + Geocoding API 활성화
 * 실행: node scripts/enable-google-maps-apis.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PROJECT = "lotto-app-ljh";
const MAPS_SERVICES = [
  "maps-backend.googleapis.com",
  "geocoding-backend.googleapis.com",
];
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

async function enableService(token, service) {
  const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services/${service}:enable`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": PROJECT,
    },
    body: "{}",
  });
  const text = await res.text();
  return { service, status: res.status, text: text.slice(0, 200) };
}

console.log(`프로젝트: ${PROJECT}\n`);
const token = await refreshAccessToken();
console.log("✓ 토큰 갱신 완료\n");

for (const service of MAPS_SERVICES) {
  const result = await enableService(token, service);
  console.log(`${service}: HTTP ${result.status}`);
  if (result.status >= 400 && !result.text.includes("already enabled")) {
    console.log(`  ${result.text}`);
  }
}

console.log("\n✅ Maps API 활성화 요청 완료 (전파에 1~2분 걸릴 수 있음)");
