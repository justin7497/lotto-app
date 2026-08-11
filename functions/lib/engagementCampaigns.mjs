/** @typedef {'install-plus-1d' | 'inactive-d3' | 'inactive-d7' | 'saturday-18kst' | 'saturday-post-draw'} CampaignSchedule */

/**
 * @typedef {Object} EngagementCampaign
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string} link
 * @property {CampaignSchedule} schedule
 * @property {number} priority
 * @property {boolean} [enabled]
 */

export const APP_BASE_URL = "https://lotto-app-ljh.web.app";
export const ENGAGEMENT_CAMPAIGNS_DOC = "appConfig/engagementCampaigns";

export const CAMPAIGN_SCHEDULES = [
  "install-plus-1d",
  "inactive-d3",
  "inactive-d7",
  "saturday-18kst",
  "saturday-post-draw",
];

/** @type {Record<CampaignSchedule, string>} */
export const SCHEDULE_LABELS = {
  "install-plus-1d": "설치 다음 날",
  "inactive-d3": "3일 미사용",
  "inactive-d7": "7일 미사용",
  "saturday-18kst": "토요일 18시 (추첨 전)",
  "saturday-post-draw": "토요일 추첨 후 (당첨 발표)",
};

/** @type {EngagementCampaign[]} */
export const ENGAGEMENT_CAMPAIGNS = [
  {
    id: "welcome-d1",
    title: "소원로또에 오신 것을 환영해요",
    body: "번호 만들기·저장 방법을 확인해 보세요",
    link: "/generator",
    schedule: "install-plus-1d",
    priority: 10,
    enabled: true,
  },
  {
    id: "inactive-d3",
    title: "아직 번호 안 만드셨나요?",
    body: "추천 번호로 3초 만에 만들 수 있어요",
    link: "/generator",
    schedule: "inactive-d3",
    priority: 20,
    enabled: true,
  },
  {
    id: "sat-pre-draw",
    title: "오늘 밤 로또 추첨",
    body: "번호 준비하셨나요? 지금 만들어 보세요",
    link: "/generator",
    schedule: "saturday-18kst",
    priority: 30,
    enabled: true,
  },
  {
    id: "sat-post-draw",
    title: "당첨번호 발표",
    body: "이번 주 당첨번호를 확인해 보세요",
    link: "/winning-numbers",
    schedule: "saturday-post-draw",
    priority: 40,
    enabled: true,
  },
  {
    id: "inactive-d7",
    title: "다시 만나요",
    body: "저장한 번호·당첨 확인을 이어가 보세요",
    link: "/",
    schedule: "inactive-d7",
    priority: 50,
    enabled: true,
  },
];

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {unknown} value
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {unknown} campaigns
 */
export function validateEngagementCampaigns(campaigns) {
  if (!Array.isArray(campaigns) || campaigns.length === 0) {
    return { ok: false, message: "캠페인이 비어 있습니다." };
  }
  if (campaigns.length > 20) {
    return { ok: false, message: "캠페인은 최대 20개까지입니다." };
  }

  const ids = new Set();
  /** @type {EngagementCampaign[]} */
  const normalized = [];

  for (const campaign of campaigns) {
    if (!campaign || typeof campaign !== "object") {
      return { ok: false, message: "캠페인 형식이 올바르지 않습니다." };
    }
    const id = String(campaign.id ?? "").trim();
    const title = String(campaign.title ?? "").trim();
    const body = String(campaign.body ?? "").trim();
    const link = String(campaign.link ?? "").trim();
    const schedule = String(campaign.schedule ?? "").trim();
    const priority = Number(campaign.priority);
    const enabled = campaign.enabled !== false;

    if (!isNonEmptyString(id) || !/^[a-z0-9-]+$/.test(id)) {
      return { ok: false, message: "캠페인 id는 영문·숫자·하이픈만 사용할 수 있습니다." };
    }
    if (ids.has(id)) {
      return { ok: false, message: `중복 캠페인 id: ${id}` };
    }
    ids.add(id);
    if (!isNonEmptyString(title) || title.length > 80) {
      return { ok: false, message: "제목은 1~80자여야 합니다." };
    }
    if (!isNonEmptyString(body) || body.length > 160) {
      return { ok: false, message: "내용은 1~160자여야 합니다." };
    }
    if (!isNonEmptyString(link) || link.length > 300) {
      return { ok: false, message: "이동 경로가 필요합니다." };
    }
    if (!CAMPAIGN_SCHEDULES.includes(schedule)) {
      return { ok: false, message: `지원하지 않는 발송 주기: ${schedule}` };
    }
    if (!Number.isFinite(priority) || priority < 1 || priority > 999) {
      return { ok: false, message: "우선순위는 1~999 사이 숫자여야 합니다." };
    }

    normalized.push({ id, title, body, link, schedule, priority, enabled });
  }

  normalized.sort((a, b) => a.priority - b.priority);
  return { ok: true, campaigns: normalized };
}

/**
 * @param {import('firebase-admin/firestore').Firestore | null | undefined} db
 */
export async function loadEngagementConfig(db) {
  if (!db) {
    return {
      source: "default",
      campaigns: ENGAGEMENT_CAMPAIGNS,
    };
  }

  const snap = await db.doc(ENGAGEMENT_CAMPAIGNS_DOC).get();
  if (!snap.exists) {
    return {
      source: "default",
      campaigns: ENGAGEMENT_CAMPAIGNS,
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
 * @param {Date} date
 */
export function toKst(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

/**
 * @param {Date} kst
 */
export function fromKst(kst) {
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000);
}

/**
 * @param {string | undefined} iso
 */
function parseIso(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/**
 * @param {EngagementCampaign} campaign
 * @param {{ installedAt?: string, lastActiveAt?: string }} device
 * @param {Date} now
 */
export function isCampaignDueForDevice(campaign, device, now = new Date()) {
  if (campaign.enabled === false) return false;

  const installedAt = parseIso(device.installedAt);
  const lastActiveAt = parseIso(device.lastActiveAt) ?? installedAt;
  if (!installedAt || !lastActiveAt) return false;

  switch (campaign.schedule) {
    case "install-plus-1d": {
      const elapsed = now.getTime() - installedAt.getTime();
      // 설치 24시간 이후 due (GitHub Actions 매일 10:00·20:00 KST에서 발송)
      return elapsed >= MS_DAY;
    }
    case "inactive-d3": {
      const inactiveMs = now.getTime() - lastActiveAt.getTime();
      const sinceInstall = now.getTime() - installedAt.getTime();
      return inactiveMs >= 3 * MS_DAY && sinceInstall >= 3 * MS_DAY;
    }
    case "inactive-d7": {
      const inactiveMs = now.getTime() - lastActiveAt.getTime();
      return inactiveMs >= 7 * MS_DAY;
    }
    case "saturday-18kst": {
      const kst = toKst(now);
      const day = kst.getUTCDay();
      const hour = kst.getUTCHours();
      // 토요 18시 크론 ±1시간 (스케줄 지연 허용)
      return day === 6 && hour >= 17 && hour <= 19;
    }
    case "saturday-post-draw":
      // 추첨 후 발송은 notify-engagement.mjs --campaign=sat-post-draw 로만 실행
      return false;
    default:
      return false;
  }
}

/**
 * @param {EngagementCampaign[]} campaigns
 * @param {CampaignSchedule | null} onlySchedule
 */
export function filterCampaignsBySchedule(campaigns, onlySchedule) {
  if (!onlySchedule) return campaigns.filter((c) => c.enabled !== false);
  return campaigns.filter((c) => c.schedule === onlySchedule && c.enabled !== false);
}

/**
 * @param {EngagementCampaign[]} campaigns
 * @param {string | null} campaignId
 */
export function filterCampaignsById(campaigns, campaignId) {
  if (!campaignId) return campaigns.filter((c) => c.enabled !== false);
  return campaigns.filter((c) => c.id === campaignId && c.enabled !== false);
}

/**
 * @param {EngagementCampaign} campaign
 */
export function buildPushPayload(campaign) {
  const link = campaign.link.startsWith("http")
    ? campaign.link
    : `${APP_BASE_URL}${campaign.link.startsWith("/") ? campaign.link : `/${campaign.link}`}`;

  return {
    notification: {
      title: campaign.title,
      body: campaign.body,
    },
    webpush: {
      fcmOptions: { link },
    },
    data: {
      campaignId: campaign.id,
      link,
      type: "engagement",
      title: campaign.title,
      body: campaign.body,
    },
    android: {
      priority: "high",
      notification: {
        title: campaign.title,
        body: campaign.body,
        channelId: "sowon_lotto_engagement",
        sound: "default",
      },
    },
  };
}
