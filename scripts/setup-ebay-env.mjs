/**
 * eBay API 키를 functions/.env.lotto-app-ljh 에 반영하고 ebayApi 재배포
 *
 * 사용법 1 — 로컬 파일 (gitignore됨):
 *   functions/.env.ebay.local 에 아래 형식으로 저장 후
 *   node scripts/setup-ebay-env.mjs
 *
 * 사용법 2 — CLI 인자:
 *   node scripts/setup-ebay-env.mjs --client-id=PRD-xxx --client-secret=xxx --env=production
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "functions/.env.lotto-app-ljh");
const localPath = join(root, "functions/.env.ebay.local");

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadLocalEnv() {
  if (!existsSync(localPath)) return {};
  return parseDotEnv(readFileSync(localPath, "utf8"));
}

function upsertEnvFile(existingText, updates) {
  const lines = existingText.split(/\r?\n/);
  const keys = new Set(Object.keys(updates));
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const key = trimmed.split("=")[0]?.trim();
    return !keys.has(key);
  });
  while (kept.length && kept[kept.length - 1] === "") kept.pop();
  const appended = Object.entries(updates).map(([k, v]) => `${k}=${v}`);
  return [...kept, "", ...appended, ""].join("\r\n");
}

const args = parseArgs();
const local = loadLocalEnv();

const clientId =
  args["client-id"] || process.env.EBAY_CLIENT_ID || local.EBAY_CLIENT_ID || "";
const clientSecret =
  args["client-secret"] ||
  process.env.EBAY_CLIENT_SECRET ||
  local.EBAY_CLIENT_SECRET ||
  "";
const ebayEnv = args.env || local.EBAY_ENV || "production";
const redirectUri =
  args["redirect-uri"] ||
  local.EBAY_REDIRECT_URI ||
  "https://kpopday-ebay.web.app/api/ebay/auth/callback";
const appOrigin =
  args["app-origin"] || local.EBAY_APP_ORIGIN || "https://kpopday-ebay.web.app";

if (!clientId || !clientSecret) {
  console.error("EBAY_CLIENT_ID / EBAY_CLIENT_SECRET 가 필요합니다.\n");
  console.error("다음 중 하나로 입력하세요:");
  console.error(`  1) ${localPath}`);
  console.error(
    "  2) node scripts/setup-ebay-env.mjs --client-id=... --client-secret=...",
  );
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.error(`파일 없음: ${envPath}`);
  process.exit(1);
}

const current = readFileSync(envPath, "utf8");
const next = upsertEnvFile(current, {
  EBAY_CLIENT_ID: clientId,
  EBAY_CLIENT_SECRET: clientSecret,
  EBAY_REDIRECT_URI: redirectUri,
  EBAY_ENV: ebayEnv,
  EBAY_APP_ORIGIN: appOrigin,
});
writeFileSync(envPath, next, "utf8");

console.log("✓ functions/.env.lotto-app-ljh 업데이트");
console.log(`  EBAY_CLIENT_ID=${clientId.slice(0, 8)}...`);
console.log(`  EBAY_ENV=${ebayEnv}`);

console.log("\n→ firebase deploy --only functions:ebayApi");
const deploy = spawnSync("firebase", ["deploy", "--only", "functions:ebayApi"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(deploy.status ?? 1);
