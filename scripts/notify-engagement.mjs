/**
 * 비로그인 기기 대상 사용 유도 푸시를 발송합니다.
 *
 * 환경 변수:
 *   FIREBASE_SERVICE_ACCOUNT_JSON
 *
 * 사용:
 *   node scripts/notify-engagement.mjs [--dry-run]
 *   node scripts/notify-engagement.mjs --campaign=sat-post-draw
 *   node scripts/notify-engagement.mjs --schedule=saturday-18kst
 *
 * 자동 발송: GitHub Actions — 매일 10:00·20:00 KST (2회), 토요 18:00 KST (추첨 전)
 */
import { resolve, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  buildPushPayload,
  engagementLogDocId,
  filterCampaignsById,
  filterCampaignsBySchedule,
  isCampaignDueForDevice,
  loadEngagementConfig,
} from "./lib/engagementCampaigns.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
  if (credPath) {
    return readFileSync(resolve(credPath), "utf8");
  }
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

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function loadDevices(db) {
  const snap = await db.collection("devices").get();
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter(
      (d) =>
        d.engagementPushEnabled !== false &&
        typeof d.fcmToken === "string" &&
        d.fcmToken,
    );
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} deviceId
 * @param {string} campaignId
 */
async function hasCampaignLog(db, deviceId, campaignId) {
  const snap = await db.doc(`devices/${deviceId}/engagementLog/${campaignId}`).get();
  if (!snap.exists) return false;
  const data = snap.data() ?? {};
  // dry-run 기록은 실제 발송을 막지 않음
  return data.dryRun !== true;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} deviceId
 * @param {string} logDocId
 * @param {{ success: boolean, dryRun?: boolean, campaignId?: string }} meta
 */
async function writeEngagementLog(db, deviceId, logDocId, meta) {
  await db.doc(`devices/${deviceId}/engagementLog/${logDocId}`).set({
    campaignId: meta.campaignId ?? logDocId,
    sentAt: new Date().toISOString(),
    success: meta.success,
    dryRun: Boolean(meta.dryRun),
  });
}

export async function notifyEngagement(options = {}) {
  const { dryRun = false, campaignId = null, schedule = null } = options;
  const explicitCampaign = Boolean(campaignId);
  const now = new Date();

  const firebase = initFirebase();
  if (!firebase) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping engagement push.");
    return { skipped: true, reason: "no-firebase" };
  }

  const { db, messaging } = firebase;
  const config = await loadEngagementConfig(db);
  let campaigns = [...config.campaigns];
  campaigns = filterCampaignsById(campaigns, campaignId);
  campaigns = filterCampaignsBySchedule(campaigns, schedule);
  // 일반 크론에서는 추첨 후 캠페인 제외 (추첨 데이터 갱신 워크플로에서만 실행)
  if (!explicitCampaign && !schedule) {
    campaigns = campaigns.filter((c) => c.schedule !== "saturday-post-draw");
  }
  campaigns.sort((a, b) => a.priority - b.priority);

  if (campaigns.length === 0) {
    console.log("No campaigns selected.");
    return { sent: 0, skipped: 0 };
  }

  const devices = await loadDevices(db);
  console.log(
    `Loaded ${devices.length} engagement devices. Campaigns: ${campaigns.map((c) => c.id).join(", ")}`,
  );

  let sent = 0;
  let skipped = 0;

  for (const device of devices) {
    const deviceId = String(device.deviceId ?? device.id);
    let pushed = false;
    for (const campaign of campaigns) {
      if (!explicitCampaign && !isCampaignDueForDevice(campaign, device, now)) continue;
      const logId = engagementLogDocId(campaign, now);
      if (await hasCampaignLog(db, deviceId, logId)) continue;

      const token = String(device.fcmToken);
      const payload = buildPushPayload(campaign);

      if (dryRun) {
        console.log(`  [dry-run] ${deviceId} ← ${campaign.id} (${logId}): ${campaign.title}`);
        sent += 1;
        pushed = true;
        break;
      }

      try {
        const result = await messaging.sendEachForMulticast({
          tokens: [token],
          ...payload,
        });
        const ok = result.successCount > 0;
        if (ok) {
          await writeEngagementLog(db, deviceId, logId, {
            success: true,
            campaignId: campaign.id,
          });
          console.log(`  push sent → ${deviceId}: ${campaign.id} (${logId})`);
          sent += 1;
          pushed = true;
        } else {
          console.warn(`  push failed → ${deviceId}: ${campaign.id}`);
        }

        if (result.failureCount > 0) {
          const err = result.responses[0]?.error;
          if (err?.code === "messaging/registration-token-not-registered") {
            await db.doc(`devices/${deviceId}`).set(
              { engagementPushEnabled: false, updatedAt: new Date().toISOString() },
              { merge: true },
            );
          }
        }
      } catch (err) {
        console.error(`  push error → ${deviceId}:`, err instanceof Error ? err.message : err);
      }

      break;
    }

    if (!pushed) skipped += 1;
  }

  console.log(`Done. sent=${sent}, skipped=${skipped}`);
  return { sent, skipped };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  notifyEngagement(args).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
