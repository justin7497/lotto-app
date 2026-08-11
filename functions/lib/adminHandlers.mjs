import {
  ENGAGEMENT_CAMPAIGNS,
  ENGAGEMENT_CAMPAIGNS_DOC,
  validateEngagementCampaigns,
} from "./engagementCampaigns.mjs";

const WISH_PHRASES_DOC = "appConfig/wishPhrases";
const MS_DAY = 24 * 60 * 60 * 1000;
const APP_BASE_URL = "https://lotto-app-ljh.web.app";

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} deviceId
 * @param {string[]} tokens
 */
async function appendDeviceToken(db, deviceId, tokens) {
  if (!deviceId) return;
  const deviceSnap = await db.doc(`devices/${deviceId}`).get();
  const token = deviceSnap.data()?.fcmToken;
  if (typeof token === "string" && token) {
    tokens.push(token);
  }
}

/**
 * @param {unknown} value
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {unknown} categories
 */
function validateWishCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { ok: false, message: "카테고리가 비어 있습니다." };
  }
  if (categories.length > 20) {
    return { ok: false, message: "카테고리는 최대 20개까지입니다." };
  }

  const ids = new Set();
  for (const category of categories) {
    if (!category || typeof category !== "object") {
      return { ok: false, message: "카테고리 형식이 올바르지 않습니다." };
    }
    const { id, emoji, label, phrases } = category;
    if (!isNonEmptyString(id) || !isNonEmptyString(label)) {
      return { ok: false, message: "카테고리 id·label이 필요합니다." };
    }
    if (ids.has(id)) {
      return { ok: false, message: `중복 카테고리 id: ${id}` };
    }
    ids.add(id);
    if (!Array.isArray(phrases) || phrases.length === 0) {
      return { ok: false, message: `${label} 카테고리에 문구가 없습니다.` };
    }
    if (phrases.length > 200) {
      return { ok: false, message: `${label} 카테고리 문구는 200개까지입니다.` };
    }
    for (const phrase of phrases) {
      if (!isNonEmptyString(phrase) || phrase.length > 120) {
        return { ok: false, message: "문구는 1~120자여야 합니다." };
      }
    }
    if (!isNonEmptyString(emoji)) {
      category.emoji = "✨";
    }
  }

  return { ok: true, categories };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function getAdminStats(db, auth) {
  const devicesSnap = await db.collection("devices").get();
  const devices = devicesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  let authUserCount = 0;
  /** @type {string | undefined} */
  let nextPageToken;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    authUserCount += result.users.length;
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  const tokensSnap = await db.collectionGroup("fcmTokens").get();
  const usersWithPush = new Set(
    tokensSnap.docs
      .map((docSnap) => docSnap.ref.parent.parent?.id)
      .filter((uid) => typeof uid === "string"),
  );

  const savedNumbersSnap = await db.collectionGroup("savedNumbers").get();
  const usersWithSavedNumbers = new Set(
    savedNumbersSnap.docs
      .map((docSnap) => docSnap.ref.parent.parent?.id)
      .filter((uid) => typeof uid === "string"),
  );

  const pushEnabledDevices = devices.filter(
    (device) => device.engagementPushEnabled !== false && typeof device.fcmToken === "string" && device.fcmToken,
  );
  const noTokenDevices = devices.filter((device) => !device.fcmToken);
  const optOutDevices = devices.filter((device) => device.engagementPushEnabled === false);
  const linkedDevices = devices.filter((device) => typeof device.linkedUid === "string" && device.linkedUid);

  /**
   * @param {import('firebase-admin/firestore').Firestore} db
   * @param {string} deviceId
   */
  async function loadLastEngagement(db, deviceId) {
    const snap = await db.collection(`devices/${deviceId}/engagementLog`).get();
    const logs = snap.docs
      .map((docSnap) => docSnap.data())
      .filter((entry) => entry.dryRun !== true && typeof entry.sentAt === "string");
    if (logs.length === 0) return null;
    logs.sort((a, b) => Date.parse(String(b.sentAt)) - Date.parse(String(a.sentAt)));
    const last = logs[0];
    return {
      campaignId: String(last.campaignId ?? ""),
      sentAt: String(last.sentAt),
      success: last.success !== false,
    };
  }

  const recentDeviceRows = [...devices]
    .sort((a, b) => Date.parse(String(b.lastActiveAt ?? "")) - Date.parse(String(a.lastActiveAt ?? "")))
    .slice(0, 12);

  const recentDevices = await Promise.all(
    recentDeviceRows.map(async (device) => {
      const hasFcmToken = typeof device.fcmToken === "string" && Boolean(device.fcmToken);
      const engagementPushEnabled = device.engagementPushEnabled !== false;
      const lastEngagement = await loadLastEngagement(db, device.id);
      return {
        id: device.id,
        lastActiveAt: device.lastActiveAt ?? null,
        installedAt: device.installedAt ?? null,
        hasFcmToken,
        engagementPushEnabled,
        pushReady: hasFcmToken && engagementPushEnabled,
        linkedUid: device.linkedUid ?? null,
        platform: device.platform ?? null,
        userAgent: typeof device.userAgent === "string" ? device.userAgent : null,
        lastEngagement,
      };
    }),
  );

  const linkedUids = [
    ...new Set(
      recentDevices
        .map((device) => device.linkedUid)
        .filter((uid) => typeof uid === "string" && uid),
    ),
  ];
  /** @type {Map<string, string>} */
  const linkedEmailByUid = new Map();
  await Promise.all(
    linkedUids.map(async (uid) => {
      try {
        const user = await auth.getUser(uid);
        if (user.email) linkedEmailByUid.set(uid, user.email);
      } catch {
        /* ignore */
      }
    }),
  );

  const recentDevicesWithAccount = recentDevices.map((device) => ({
    ...device,
    linkedEmail:
      device.linkedUid && linkedEmailByUid.has(device.linkedUid)
        ? linkedEmailByUid.get(device.linkedUid)
        : null,
  }));

  return {
    generatedAt: new Date().toISOString(),
    devices: {
      total: devices.length,
      pushReady: pushEnabledDevices.length,
      noToken: noTokenDevices.length,
      optOut: optOutDevices.length,
      linked: linkedDevices.length,
    },
    users: {
      total: authUserCount,
      withPushTokens: usersWithPush.size,
      withSavedNumbers: usersWithSavedNumbers.size,
      savedNumberSets: savedNumbersSnap.size,
    },
    recentDevices: recentDevicesWithAccount,
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function getWishPhrases(db) {
  const snap = await db.doc(WISH_PHRASES_DOC).get();
  if (!snap.exists) {
    return { source: "default", categories: null, updatedAt: null, updatedBy: null };
  }
  const data = snap.data() ?? {};
  return {
    source: "remote",
    categories: Array.isArray(data.categories) ? data.categories : null,
    updatedAt: data.updatedAt ?? null,
    updatedBy: data.updatedBy ?? null,
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {unknown} categories
 * @param {string} updatedBy
 */
export async function saveWishPhrases(db, categories, updatedBy) {
  const validated = validateWishCategories(categories);
  if (!validated.ok) {
    return { ok: false, status: 400, message: validated.message };
  }

  await db.doc(WISH_PHRASES_DOC).set({
    categories: validated.categories,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });

  return { ok: true };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function resetWishPhrases(db) {
  await db.doc(WISH_PHRASES_DOC).delete();
  return { ok: true };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function getEngagementCampaigns(db) {
  const snap = await db.doc(ENGAGEMENT_CAMPAIGNS_DOC).get();
  if (!snap.exists) {
    return {
      source: "default",
      campaigns: ENGAGEMENT_CAMPAIGNS,
      updatedAt: null,
      updatedBy: null,
    };
  }
  const data = snap.data() ?? {};
  const validatedCampaigns = validateEngagementCampaigns(
    Array.isArray(data.campaigns) ? data.campaigns : ENGAGEMENT_CAMPAIGNS,
  );
  return {
    source: "remote",
    campaigns: validatedCampaigns.ok ? validatedCampaigns.campaigns : ENGAGEMENT_CAMPAIGNS,
    updatedAt: data.updatedAt ?? null,
    updatedBy: data.updatedBy ?? null,
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {unknown} campaigns
 * @param {string} updatedBy
 */
export async function saveEngagementCampaigns(db, campaigns, updatedBy) {
  const validatedCampaigns = validateEngagementCampaigns(campaigns);
  if (!validatedCampaigns.ok) {
    return { ok: false, status: 400, message: validatedCampaigns.message };
  }

  await db.doc(ENGAGEMENT_CAMPAIGNS_DOC).set({
    campaigns: validatedCampaigns.campaigns,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });

  return { ok: true };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function resetEngagementCampaigns(db) {
  await db.doc(ENGAGEMENT_CAMPAIGNS_DOC).delete();
  return { ok: true };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {string} currentDeviceId
 */
export async function getPushTargets(db, uid, currentDeviceId = "") {
  /** @type {Array<{ type: string, id: string, platform?: string | null, hasToken: boolean }>} */
  const targets = [];
  const tokenSet = new Set();

  const userTokens = await db.collection(`users/${uid}/fcmTokens`).get();
  for (const docSnap of userTokens.docs) {
    const token = docSnap.data()?.token;
    const hasToken = typeof token === "string" && Boolean(token);
    if (hasToken) tokenSet.add(token);
    targets.push({ type: "account", id: docSnap.id, hasToken });
  }

  const linkedDevices = await db.collection("devices").where("linkedUid", "==", uid).get();
  for (const docSnap of linkedDevices.docs) {
    const data = docSnap.data();
    const token = data.fcmToken;
    const hasToken = typeof token === "string" && Boolean(token);
    if (hasToken) tokenSet.add(token);
    targets.push({
      type: "device",
      id: docSnap.id,
      platform: data.platform ?? null,
      hasToken,
    });
  }

  if (currentDeviceId) {
    const currentSnap = await db.doc(`devices/${currentDeviceId}`).get();
    const token = currentSnap.data()?.fcmToken;
    const hasToken = typeof token === "string" && Boolean(token);
    if (hasToken) tokenSet.add(token);
    if (!targets.some((row) => row.id === currentDeviceId)) {
      targets.push({
        type: "current",
        id: currentDeviceId,
        platform: currentSnap.data()?.platform ?? null,
        hasToken,
      });
    }
  }

  return {
    tokenCount: tokenSet.size,
    targets,
  };
}

/**
 * @param {string} token
 */
function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h << 5) - h + token.charCodeAt(i);
    h |= 0;
  }
  return `t${Math.abs(h)}`;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {string} deviceId
 */
export async function syncDeviceToAccount(db, uid, deviceId) {
  const trimmedId = String(deviceId ?? "").trim();
  if (!trimmedId) {
    return { ok: false, status: 400, message: "기기 ID가 필요합니다." };
  }

  const snap = await db.doc(`devices/${trimmedId}`).get();
  if (!snap.exists) {
    return { ok: false, status: 404, message: "기기를 찾을 수 없습니다." };
  }

  const data = snap.data() ?? {};
  const token = typeof data.fcmToken === "string" ? data.fcmToken : "";
  const now = new Date().toISOString();

  await db.doc(`devices/${trimmedId}`).set(
    {
      linkedUid: uid,
      updatedAt: now,
    },
    { merge: true },
  );

  if (token) {
    await db.doc(`users/${uid}/fcmTokens/${hashToken(token)}`).set(
      {
        token,
        createdAt: now,
        userAgent: typeof data.userAgent === "string" ? data.userAgent : "",
        platform: typeof data.platform === "string" ? data.platform : null,
      },
      { merge: true },
    );
  }

  return {
    ok: true,
    hasToken: Boolean(token),
    platform: typeof data.platform === "string" ? data.platform : null,
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} deviceId
 * @param {Map<string, { token: string, platform: string | null, deviceId: string | null, source: string }>} tokenMap
 */
async function appendDeviceTokenMeta(db, deviceId, tokenMap) {
  if (!deviceId) return;
  const deviceSnap = await db.doc(`devices/${deviceId}`).get();
  const data = deviceSnap.data() ?? {};
  const token = data.fcmToken;
  if (typeof token !== "string" || !token) return;
  tokenMap.set(token, {
    token,
    platform: typeof data.platform === "string" ? data.platform : null,
    deviceId,
    source: "device",
  });
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {import('firebase-admin/messaging').Messaging} messaging
 * @param {{ uid: string, email: string }} admin
 * @param {{ channel: string, title: string, body: string, link?: string, deviceId?: string, currentDeviceId?: string }} payload
 */
export async function sendTestPush(db, messaging, admin, payload) {
  const title = String(payload.title ?? "").trim() || "소원로또 테스트";
  const body = String(payload.body ?? "").trim() || "관리자 테스트 알림입니다.";
  const linkPath = String(payload.link ?? "/").trim() || "/";
  const fullLink = linkPath.startsWith("http")
    ? linkPath
    : `${APP_BASE_URL}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}`;
  const channel = String(payload.channel ?? "self").trim();
  const currentDeviceId = String(payload.currentDeviceId ?? "").trim();
  const targetDeviceId = String(payload.deviceId ?? "").trim();

  /** @type {Map<string, { token: string, platform: string | null, deviceId: string | null, source: string }>} */
  const tokenMap = new Map();

  if (channel === "device" && targetDeviceId) {
    await appendDeviceTokenMeta(db, targetDeviceId, tokenMap);
  } else if (channel === "engagement-all") {
    const devicesSnap = await db.collection("devices").get();
    for (const docSnap of devicesSnap.docs) {
      const data = docSnap.data();
      if (data.engagementPushEnabled !== false && typeof data.fcmToken === "string" && data.fcmToken) {
        tokenMap.set(data.fcmToken, {
          token: data.fcmToken,
          platform: typeof data.platform === "string" ? data.platform : null,
          deviceId: docSnap.id,
          source: "engagement-all",
        });
      }
    }
  } else {
    const tokenSnap = await db.collection(`users/${admin.uid}/fcmTokens`).get();
    for (const docSnap of tokenSnap.docs) {
      const token = docSnap.data()?.token;
      if (typeof token === "string" && token) {
        tokenMap.set(token, {
          token,
          platform: docSnap.data()?.platform ?? null,
          deviceId: null,
          source: "account",
        });
      }
    }

    if (currentDeviceId) {
      await syncDeviceToAccount(db, admin.uid, currentDeviceId);
      await appendDeviceTokenMeta(db, currentDeviceId, tokenMap);
    }

    const devicesSnap = await db
      .collection("devices")
      .where("linkedUid", "==", admin.uid)
      .limit(10)
      .get();
    for (const docSnap of devicesSnap.docs) {
      const data = docSnap.data();
      if (data.engagementPushEnabled !== false && typeof data.fcmToken === "string" && data.fcmToken) {
        tokenMap.set(data.fcmToken, {
          token: data.fcmToken,
          platform: typeof data.platform === "string" ? data.platform : null,
          deviceId: docSnap.id,
          source: "linked",
        });
      }
    }
  }

  const tokenRows = [...tokenMap.values()];
  if (tokenRows.length === 0) {
    return {
      ok: false,
      status: 400,
      message:
        "발송할 FCM 토큰이 없습니다. 폰에서 관리자 → 알림 테스트 → 「이 기기 알림 등록」을 눌러 주세요.",
    };
  }

  /** @type {Array<{ platform: string | null, deviceId: string | null, source: string, ok: boolean, error?: string }>} */
  const deliveries = [];
  let success = 0;
  let failure = 0;
  const errors = [];

  for (const row of tokenRows.slice(0, 50)) {
    const isAndroid = row.platform === "android-app";
    const androidChannelId = "sowon_lotto_engagement";
    const message = {
      token: row.token,
      notification: { title, body },
      data: {
        link: fullLink,
        campaignId: "admin-test",
        type: "admin-test",
        title,
        body,
      },
      webpush: {
        fcmOptions: { link: fullLink },
      },
      android: {
        priority: "high",
        notification: isAndroid
          ? {
              title,
              body,
              channelId: androidChannelId,
              sound: "default",
            }
          : undefined,
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
          },
        },
      },
    };

    try {
      await messaging.send(message);
      success += 1;
      deliveries.push({
        platform: row.platform,
        deviceId: row.deviceId,
        source: row.source,
        ok: true,
      });
    } catch (error) {
      failure += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      deliveries.push({
        platform: row.platform,
        deviceId: row.deviceId,
        source: row.source,
        ok: false,
        error: errorMessage,
      });
    }
  }

  const androidCount = deliveries.filter((row) => row.platform === "android-app").length;
  const pcCount = deliveries.filter((row) => row.platform && row.platform !== "android-app").length;

  return {
    ok: success > 0,
    sent: success,
    failed: failure,
    tokens: tokenRows.length,
    deliveries,
    androidCount,
    pcCount,
    errors: errors.slice(0, 3),
    message:
      success > 0
        ? undefined
        : errors[0] ?? "푸시 발송에 실패했습니다. 알림 등록 상태를 확인해 주세요.",
  };
}
