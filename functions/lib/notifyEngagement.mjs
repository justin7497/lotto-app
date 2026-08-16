/**
 * 비로그인 기기 참여 유도 푸시
 */
import {
  buildPushPayload,
  engagementLogDocId,
  filterCampaignsById,
  filterCampaignsBySchedule,
  isCampaignDueForDevice,
  loadEngagementConfig,
} from "./engagementCampaigns.mjs";

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

async function hasCampaignLog(db, deviceId, campaignId) {
  const snap = await db.doc(`devices/${deviceId}/engagementLog/${campaignId}`).get();
  if (!snap.exists) return false;
  const data = snap.data() ?? {};
  return data.dryRun !== true;
}

async function writeEngagementLog(db, deviceId, logDocId, meta) {
  await db.doc(`devices/${deviceId}/engagementLog/${logDocId}`).set({
    campaignId: meta.campaignId ?? logDocId,
    sentAt: new Date().toISOString(),
    success: meta.success,
    dryRun: Boolean(meta.dryRun),
  });
}

/**
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   messaging: import('firebase-admin/messaging').Messaging,
 *   dryRun?: boolean,
 *   campaignId?: string | null,
 *   schedule?: string | null,
 * }} options
 */
export async function notifyEngagement(options) {
  const {
    db,
    messaging,
    dryRun = false,
    campaignId = null,
    schedule = null,
  } = options;
  const explicitCampaign = Boolean(campaignId);
  const now = new Date();

  const config = await loadEngagementConfig(db);
  let campaigns = [...config.campaigns];
  campaigns = filterCampaignsById(campaigns, campaignId);
  campaigns = filterCampaignsBySchedule(campaigns, schedule);
  if (!explicitCampaign && !schedule) {
    campaigns = campaigns.filter((c) => c.schedule !== "saturday-post-draw");
  }
  campaigns.sort((a, b) => a.priority - b.priority);

  if (campaigns.length === 0) {
    console.log("notifyEngagement: no campaigns selected");
    return { sent: 0, skipped: 0 };
  }

  const devices = await loadDevices(db);
  console.log(
    `notifyEngagement: ${devices.length} devices, campaigns=${campaigns.map((c) => c.id).join(",")}`,
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

  console.log(`notifyEngagement done. sent=${sent}, skipped=${skipped}`);
  return { sent, skipped };
}
