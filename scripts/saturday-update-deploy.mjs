/**
 * 토요일 추첨 후 회차 갱신 + 알림 + 배포 (GitHub Actions 백업용)
 *
 * 사용: node scripts/saturday-update-deploy.mjs
 * 환경: GOOGLE_APPLICATION_CREDENTIALS 또는 .secrets/firebase-adminsdk.json
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { updateLottoData } from "./update-lotto-data.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const CRED_PATH = resolve(ROOT, ".secrets/firebase-adminsdk.json");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function ensureCredentialsEnv() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return;
  if (existsSync(CRED_PATH)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = CRED_PATH;
  }
}

async function main() {
  ensureCredentialsEnv();

  const before = Number(
    execSync(
      'node -e "const r=require(\'./artifacts/lotto-app/src/data/lottoData.json\');console.log(Math.max(...r.map(x=>x.drwNo)))"',
      { cwd: ROOT, encoding: "utf8" },
    ).trim(),
  );

  const { added, latestDrwNo } = await updateLottoData();
  console.log(`Update: ${before} -> ${latestDrwNo} (added ${added})`);

  if (added === 0) {
    console.log("No new round yet. Will retry later.");
    return;
  }

  try {
    run('git config user.name "lotto-saturday-backup"');
    run('git config user.email "lotto-saturday-backup@local"');
    run("git add artifacts/lotto-app/src/data/lottoData.json");
    run(`git commit -m "chore: update lotto data to ${latestDrwNo}회 (local backup)"`);
    run("git push origin main");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("nothing to commit")) {
      console.warn("Git push skipped:", msg);
    }
  }

  run("node scripts/notify-winners.mjs", { env: process.env });
  run("node scripts/notify-device-wins.mjs", { env: process.env });
  run("node scripts/notify-engagement.mjs --campaign=sat-post-draw", { env: process.env });

  run("node scripts/refresh-lotto-detail-sync.mjs", { env: process.env });

  run("corepack pnpm run build:lotto");
  run("node scripts/verify-lotto-sync.mjs");
  run("firebase deploy --only hosting:lotto,functions,firestore:rules --project lotto-app-ljh --non-interactive");

  console.log(`Saturday backup deploy complete. Latest: ${latestDrwNo}회`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
