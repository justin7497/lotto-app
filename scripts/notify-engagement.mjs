/**
 * CLI: 비로그인 기기 참여 유도 푸시
 * 운영(추첨 후): Firebase Functions scheduledLottoSync → sat-post-draw
 *
 * 사용:
 *   node scripts/notify-engagement.mjs [--dry-run]
 *   node scripts/notify-engagement.mjs --campaign=sat-post-draw
 */
import { resolve, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { notifyEngagement } from "../functions/lib/notifyEngagement.mjs";

function parseArgs(argv) {
  let dryRun = false;
  let campaignId = null;
  let schedule = null;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--campaign=")) campaignId = arg.split("=")[1];
    else if (arg.startsWith("--schedule=")) schedule = arg.split("=")[1];
  }
  return { dryRun, campaignId, schedule };
}

function loadServiceAccountJson() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline?.trim()) return inline;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) return readFileSync(resolve(credPath), "utf8");
  return null;
}

function initFirebase() {
  const raw = loadServiceAccountJson();
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

export async function notifyEngagementCli(options = {}) {
  const firebase = initFirebase();
  if (!firebase) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping engagement push.");
    return { skipped: true, reason: "no-firebase" };
  }
  return notifyEngagement({
    ...firebase,
    dryRun: Boolean(options.dryRun),
    campaignId: options.campaignId ?? null,
    schedule: options.schedule ?? null,
  });
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  notifyEngagementCli(args).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
