/**
 * Maps 전용 API 키 생성 (웹 지도 + 빌드 지오코딩)
 * 실행: node scripts/create-google-maps-api-key.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const PROJECT = "lotto-app-ljh";
const CONFIG_PATH = join(homedir(), ".config", "configstore", "firebase-tools.json");
const ENV_LOCAL = join(dirname(fileURLToPath(import.meta.url)), "..", "artifacts/lotto-app/.env.local");
const OAUTH_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const OAUTH_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const REFERRERS = [
  "https://lotto-app-ljh.web.app/*",
  "https://lotto-app-ljh.firebaseapp.com/*",
  "http://localhost:5173/*",
  "http://127.0.0.1:5173/*",
];

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
  return data.access_token;
}

async function api(token, method, url, body) {
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

async function waitForOperation(token, operationName) {
  for (let i = 0; i < 30; i += 1) {
    const res = await api(token, "GET", `https://apikeys.googleapis.com/v2/${operationName}`);
    if (res.status !== 200) {
      throw new Error(`operation 조회 실패: ${res.text}`);
    }
    const op = JSON.parse(res.text);
    if (op.done) {
      if (op.error) throw new Error(JSON.stringify(op.error));
      return op.response;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("operation 시간 초과");
}

async function createKey(token, displayName, restrictions) {
  const create = await api(
    token,
    "POST",
    `https://apikeys.googleapis.com/v2/projects/${PROJECT}/locations/global/keys`,
    { displayName, restrictions },
  );
  if (create.status !== 200) {
    throw new Error(`키 생성 실패 (${displayName}): ${create.text}`);
  }
  const created = JSON.parse(create.text);
  let keyName = created.name;
  if (keyName?.startsWith("operations/")) {
    const result = await waitForOperation(token, keyName);
    keyName = result.name;
  }
  if (!keyName?.includes("/keys/")) {
    throw new Error(`키 리소스 없음 (${displayName}): ${JSON.stringify(created)}`);
  }

  const keyString = await api(
    token,
    "GET",
    `https://apikeys.googleapis.com/v2/${keyName}/keyString`,
  );
  if (keyString.status !== 200) {
    throw new Error(`키 문자열 조회 실패 (${displayName}): ${keyString.text}`);
  }
  return JSON.parse(keyString.text).keyString;
}

function upsertEnv(key, value) {
  let env = readFileSync(ENV_LOCAL, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(env)) {
    env = env.replace(pattern, `${key}=${value}`);
  } else {
    env += `\n${key}=${value}\n`;
  }
  writeFileSync(ENV_LOCAL, env, "utf8");
}

const token = await refreshAccessToken();
console.log(`프로젝트: ${PROJECT}\n`);

await api(
  token,
  "POST",
  `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services/apikeys.googleapis.com:enable`,
  {},
);

const webKey = await createKey(token, "lotto-app-maps-web", {
  apiTargets: [{ service: "maps-backend.googleapis.com" }],
  browserKeyRestrictions: { allowedReferrers: REFERRERS },
});

const geocodeKey = await createKey(token, "lotto-app-maps-geocode", {
  apiTargets: [{ service: "geocoding-backend.googleapis.com" }],
});

upsertEnv("VITE_GOOGLE_MAPS_API_KEY", webKey);
upsertEnv("GOOGLE_MAPS_GEOCODE_API_KEY", geocodeKey);
console.log("✅ .env.local 업데이트 완료");

const testAddr = encodeURIComponent("서울 강서구 금낭화로 91-12");
const geoRes = await fetch(
  `https://maps.googleapis.com/maps/api/geocode/json?address=${testAddr}&key=${geocodeKey}&language=ko&region=kr`,
);
const geo = await geoRes.json();
console.log("Geocoding 테스트:", geo.status);
if (geo.status !== "OK") {
  console.log(geo.error_message ?? geo);
  process.exit(1);
}

console.log("✅ Maps API 키 설정 완료");
