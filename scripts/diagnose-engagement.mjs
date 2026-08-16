/**
 * Engagement 발송 스킵 원인 진단
 * 사용: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/diagnose-engagement.mjs
 */
import { resolve, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { isCampaignDueForDevice, loadEngagementConfig } from "./lib/engagementCampaigns.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadServiceAccountJson() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline?.trim()) return inline;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) return readFileSync(resolve(credPath), "utf8");
  const fallback = resolve(ROOT, ".secrets/firebase-adminsdk.json");
  return readFileSync(fallback, "utf8");
}

const sa = JSON.parse(loadServiceAccountJson());
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = new Date();

const config = await loadEngagementConfig(db);
const campaigns = [...config.campaigns]
  .filter((c) => c.enabled !== false && c.schedule !== "saturday-post-draw")
  .sort((a, b) => a.priority - b.priority);

const snap = await db.collection("devices").get();
const devices = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter(
    (d) =>
      d.engagementPushEnabled !== false &&
      typeof d.fcmToken === "string" &&
      d.fcmToken,
  );

let due = 0;
let already = 0;
let notDue = 0;
const dueSamples = [];
const skipSamples = [];

for (const device of devices) {
  const deviceId = String(device.deviceId ?? device.id);
  let matched = false;

  for (const campaign of campaigns) {
    const logSnap = await db.doc(`devices/${deviceId}/engagementLog/${campaign.id}`).get();
    const hasLog = logSnap.exists && logSnap.data()?.dryRun !== true;
    const isDue = isCampaignDueForDevice(campaign, device, now);

    if (hasLog) continue;
    if (isDue) {
      due += 1;
      matched = true;
      if (dueSamples.length < 8) {
        dueSamples.push({
          deviceId: `${deviceId.slice(0, 8)}…`,
          campaign: campaign.id,
          installedAt: device.installedAt ?? null,
          lastActiveAt: device.lastActiveAt ?? null,
        });
      }
      break;
    }
  }

  if (matched) continue;

  // 왜 스킵인지 — 첫 캠페인 기준 요약
  const first = campaigns[0];
  const firstLog = first
    ? await db.doc(`devices/${deviceId}/engagementLog/${first.id}`).get()
    : null;
  const firstAlready = Boolean(firstLog?.exists && firstLog.data()?.dryRun !== true);
  if (firstAlready) already += 1;
  else notDue += 1;

  if (skipSamples.length < 6) {
    skipSamples.push({
      deviceId: `${deviceId.slice(0, 8)}…`,
      installedAt: device.installedAt ?? null,
      lastActiveAt: device.lastActiveAt ?? null,
      welcomeLogged: firstAlready,
      welcomeDue: first ? isCampaignDueForDevice(first, device, now) : false,
    });
  }
}

console.log(
  JSON.stringify(
    {
      nowKst: new Date(now.getTime() + 9 * 3600 * 1000).toISOString().replace("Z", "+09:00"),
      devices: devices.length,
      due,
      alreadyHadCampaign: already,
      notDueYet: notDue,
      campaigns: campaigns.map((c) => `${c.id}(${c.schedule})`),
      dueSamples,
      skipSamples,
    },
    null,
    2,
  ),
);
