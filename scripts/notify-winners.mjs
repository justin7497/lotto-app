/**
 * CLI: 새 회차 추첨 후 당첨 사용자에게 이메일·푸시 알림.
 * 운영 경로: Firebase Functions scheduledLottoSync → runPostDrawNotifications
 *
 * 환경 변수: FIREBASE_SERVICE_ACCOUNT_JSON, RESEND_API_KEY, RESEND_FROM_EMAIL
 * 사용: node scripts/notify-winners.mjs [--drw-no=1231] [--dry-run]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { notifyWinners } from "../functions/lib/notifyWinners.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");

function parseArgs(argv) {
  let drwNo = null;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--drw-no=")) drwNo = parseInt(arg.split("=")[1], 10);
  }
  return { drwNo, dryRun };
}

function loadLatestRound(requestedDrwNo) {
  const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("lottoData.json is empty");
  }
  const byNo = new Map(rows.map((r) => [r.drwNo, r]));
  const latestDrwNo = Math.max(...rows.map((r) => r.drwNo));
  const drwNo = requestedDrwNo ?? latestDrwNo;
  const round = byNo.get(drwNo);
  if (!round) throw new Error(`Round ${drwNo} not found in lottoData.json`);
  return { round, drwNo };
}

function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const serviceAccount = JSON.parse(raw);
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  return {
    db: getFirestore(),
    auth: getAuth(),
    messaging: getMessaging(),
  };
}

export async function notifyWinnersCli(options = {}) {
  const { drwNo: requestedDrwNo = null, dryRun = false } = options;
  const { round } = loadLatestRound(requestedDrwNo);
  const firebase = initFirebase();
  if (!firebase) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping notifications.");
    return { skipped: true, reason: "no-firebase" };
  }
  return notifyWinners({
    ...firebase,
    round,
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    dryRun,
  });
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  notifyWinnersCli(args).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
