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
 * 만료 토큰만 제거. engagementPushEnabled는 건드리지 않음(사용자 opt-out과 구분).
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} deviceId
 */
async function clearDeadDeviceToken(db, deviceId) {
  await db.doc(`devices/${deviceId}`).set(
    { fcmToken: null, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

/**
 * 당첨번호 알림만 — 회차당 1회, 500대씩 한 번에 발송
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   messaging: import('firebase-admin/messaging').Messaging,
 *   devices: Array<{ id?: string, deviceId?: string, fcmToken: string }>,
 *   campaign: { id: string, schedule: string, title: string, body: string, link: string },
 *   round: { drwNo?: number },
 *   dryRun?: boolean,
 * }} options
 */
async function sendDrawNumberPush(options) {
  const { db, messaging, devices, campaign, round, dryRun = false } = options;
  const logId = engagementLogDocId(campaign, new Date(), round);
  const payload = buildPushPayload(campaign, round);
  const checks = await mapPool(devices, 24, async (device) => {
    const deviceId = String(device.deviceId ?? device.id);
    const already = await hasCampaignLog(db, deviceId, logId);
    return already ? null : { deviceId, token: String(device.fcmToken) };
  });
  const eligible = checks.filter(Boolean);
  console.log(
    `draw-number push ${round.drwNo}회: devices=${devices.length}, toSend=${eligible.length}, log=${logId}`,
  );
  if (eligible.length === 0) {
    return { sent: 0, skipped: devices.length };
  }

  let sent = 0;
  for (let offset = 0; offset < eligible.length; offset += 500) {
    const group = eligible.slice(offset, offset + 500);
    if (dryRun) {
      sent += group.length;
      continue;
    }
    const result = await messaging.sendEachForMulticast({
      tokens: group.map((item) => item.token),
      ...payload,
    });
    await mapPool(group, 24, async (item, index) => {
      const response = result.responses[index];
      if (response?.success) {
        sent += 1;
        await writeEngagementLog(db, item.deviceId, logId, {
          success: true,
          campaignId: campaign.id,
        });
        return;
      }
      const code = response?.error?.code;
      if (code === "messaging/registration-token-not-registered") {
        await clearDeadDeviceToken(db, item.deviceId);
      } else if (response?.error) {
        console.warn(`  draw-number push failed → ${item.deviceId}: ${response.error.message}`);
      }
    });
  }

  console.log(`draw-number push done. sent=${sent}, skipped=${devices.length - eligible.length}`);
  return { sent, skipped: devices.length - eligible.length };
}

/**
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   messaging: import('firebase-admin/messaging').Messaging,
 *   dryRun?: boolean,
 *   campaignId?: string | null,
 *   schedule?: string | null,
 *   round?: { drwNo?: number, drwtNo1?: number, drwtNo2?: number, drwtNo3?: number, drwtNo4?: number, drwtNo5?: number, drwtNo6?: number, bnusNo?: number } | null,
 * }} options
 */
export async function notifyEngagement(options) {
  const {
    db,
    messaging,
    dryRun = false,
    campaignId = null,
    schedule = null,
    round = null,
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

  if (explicitCampaign && campaignId === "sat-post-draw" && campaigns.length === 1 && round?.drwNo) {
    return sendDrawNumberPush({
      db,
      messaging,
      devices,
      campaign: campaigns[0],
      round,
      dryRun,
    });
  }
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
      const logId = engagementLogDocId(campaign, now, round);
      if (await hasCampaignLog(db, deviceId, logId)) continue;

      const token = String(device.fcmToken);
      const payload = buildPushPayload(campaign, round);

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
            await clearDeadDeviceToken(db, deviceId);
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
