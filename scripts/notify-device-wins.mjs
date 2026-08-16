/**
 * CLI: 발급완료(QR 슬립) 기기 FCM 당첨 알림
 * 운영 경로: Firebase Functions scheduledLottoSync → runPostDrawNotifications
 *
 * 사용: node scripts/notify-device-wins.mjs [--drw-no=1235] [--dry-run]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { notifyDeviceWins } from "../functions/lib/notifyDeviceWins.mjs";

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
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const raw = inline?.trim() || (credPath ? readFileSync(resolve(credPath), "utf8") : null);
  if (!raw) return null;
  const serviceAccount = JSON.parse(raw);
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  return {
    db: getFirestore(),
    messaging: getMessaging(),
  };
}

export async function notifyDeviceWinsCli(options = {}) {
  const { drwNo: requestedDrwNo = null, dryRun = false } = options;
  const { round } = loadLatestRound(requestedDrwNo);
  const firebase = initFirebase();
  if (!firebase) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping device win push.");
    return { skipped: true, reason: "no-firebase" };
  }
  return notifyDeviceWins({ ...firebase, round, dryRun });
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  notifyDeviceWinsCli(args).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
