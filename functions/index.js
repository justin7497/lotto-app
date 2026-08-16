const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret, defineString } = require("firebase-functions/params");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { Resend } = require("resend");
const { verifyAdminRequest } = require("./lib/adminAuth.mjs");
const {
  getAdminStats,
  getWishPhrases,
  saveWishPhrases,
  resetWishPhrases,
  getEngagementCampaigns,
  saveEngagementCampaigns,
  resetEngagementCampaigns,
  getPushTargets,
  sendTestPush,
  syncDeviceToAccount,
} = require("./lib/adminHandlers.mjs");
const {
  buildDirectPasswordResetUrl,
  buildPasswordResetEmailHtml,
} = require("./lib/passwordResetEmail.mjs");

const sazuApiKeySecret = defineSecret("SAZU_API_KEY");
const slipOmrUrlSecret = defineSecret("SLIP_OMR_URL");
const resendApiKeyParam = defineString("RESEND_API_KEY", { default: "" });
const resendFromEmailParam = defineString("RESEND_FROM_EMAIL", { default: "onboarding@resend.dev" });
const adminEmailsParam = defineString("ADMIN_EMAILS", { default: "" });
const ebayClientIdParam = defineString("EBAY_CLIENT_ID", { default: "" });
const ebayClientSecretParam = defineString("EBAY_CLIENT_SECRET", { default: "" });
const ebayRedirectUriParam = defineString("EBAY_REDIRECT_URI", {
  default: "https://kpopday-ebay.web.app/api/ebay/auth/callback",
});
const ebayEnvParam = defineString("EBAY_ENV", { default: "sandbox" });
const ebayAppOriginParam = defineString("EBAY_APP_ORIGIN", {
  default: "https://kpopday-ebay.web.app",
});

const PASSWORD_RESET_CONTINUE_URL = "https://lotto-app-ljh.web.app/reset-password";

function getAdminAuth() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getAuth();
}

function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getFirestore();
}

function getAdminMessaging() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getMessaging();
}

function parseAdminSubPath(pathOnly) {
  const match = pathOnly.match(/\/api\/admin\/?(.*)$/);
  return match ? match[1].replace(/\/$/, "") : "";
}

function parseAdminPath(req) {
  const pathOnly = String(req.path || req.url || "").split("?")[0];
  return parseAdminSubPath(pathOnly);
}

let lottoDetailModule;
async function getLottoDetailModule() {
  if (!lottoDetailModule) {
    lottoDetailModule = await import("./lib/lottoDetail.mjs");
  }
  return lottoDetailModule;
}

const DHLOTTERY_URL =
  "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
  "X-Requested-With": "XMLHttpRequest",
};

const memCache = new Map();

async function fetchFromDhlottery(drwNo) {
  try {
    const res = await fetch(`${DHLOTTERY_URL}${drwNo}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) return null;
    const text = await res.text();
    if (!text.trim().startsWith("{")) return null;
    const data = JSON.parse(text);
    if (data.returnValue !== "success") return null;
    return {
      drwNo: data.drwNo,
      drwNoDate: data.drwNoDate,
      drwtNo1: data.drwtNo1,
      drwtNo2: data.drwtNo2,
      drwtNo3: data.drwtNo3,
      drwtNo4: data.drwtNo4,
      drwtNo5: data.drwtNo5,
      drwtNo6: data.drwtNo6,
      bnusNo: data.bnusNo,
    };
  } catch {
    return null;
  }
}

async function fetchFromPyony(drwNo) {
  try {
    const res = await fetch(`https://pyony.com/lotto/rounds/${drwNo}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dateMatch = html.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*추첨/);
    if (!dateMatch) return null;
    const drwNoDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
    const numRegex = /<div[^>]+numberCircle[^>]*><strong>(\d+)<\/strong><\/div>/g;
    const nums = [];
    let match;
    while ((match = numRegex.exec(html)) !== null) {
      nums.push(Number(match[1]));
    }
    if (nums.length < 7) return null;
    const [drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo] = nums;
    return { drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo };
  } catch {
    return null;
  }
}

async function fetchRound(drwNo) {
  if (memCache.has(drwNo)) return memCache.get(drwNo);
  const fetched = (await fetchFromDhlottery(drwNo)) ?? (await fetchFromPyony(drwNo));
  if (fetched) memCache.set(drwNo, fetched);
  return fetched;
}

async function findLatestRound() {
  // 캐시된 최신+1부터 순방향 확인 — 토요 API 오픈 직후에 이진 탐색보다 빠름
  try {
    const syncSnap = await getAdminDb().doc("appConfig/lottoSync").get();
    const cached = Number(syncSnap.data()?.latestDrwNo) || 0;
    if (cached >= 1) {
      const next = await fetchRound(cached + 1);
      if (next) {
        let latest = next;
        for (let n = cached + 2; n <= cached + 6; n += 1) {
          const round = await fetchRound(n);
          if (!round) break;
          latest = round;
        }
        return latest;
      }
      const current = await fetchRound(cached);
      if (current) return current;
    }
  } catch (error) {
    console.warn("findLatestRound cache probe failed", error);
  }

  let lo = 1100;
  let hi = 1400;
  let latest = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const round = await fetchRound(mid);
    if (round) {
      latest = round;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return latest;
}

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Cache-Control", "public, max-age=60");
}

function setEbayCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Cache-Control", "no-store");
}

function parseLottoSubPath(pathOnly) {
  const apiMatch = pathOnly.match(/\/api\/lotto\/(.*)$/);
  if (apiMatch) return apiMatch[1].replace(/\/$/, "");
  const lottoMatch = pathOnly.match(/\/lotto\/(.*)$/);
  if (lottoMatch) return lottoMatch[1].replace(/\/$/, "");
  const trimmed = pathOnly.replace(/^\/+/, "");
  if (/^(detail|stores|batch|latest)(\/|$)/.test(trimmed)) return trimmed.replace(/\/$/, "");
  if (/^\d+$/.test(trimmed)) return trimmed;
  return "";
}

function parseLottoPath(req) {
  const pathOnly = String(req.path || req.url || "").split("?")[0];
  return parseLottoSubPath(pathOnly);
}

exports.sazuAnalyze = onRequest(
  {
    region: "asia-northeast3",
    secrets: [sazuApiKeySecret],
    cors: true,
    timeoutSeconds: 20,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, message: "Method not allowed" });
      return;
    }

    const body = req.body ?? {};
    const endpoint =
      process.env.SAZU_ENDPOINT_URL && process.env.SAZU_ENDPOINT_URL.trim().length > 0
        ? process.env.SAZU_ENDPOINT_URL.trim()
        : "https://api.sazu.app/v1/sazu/calculate";
    const apiKey = sazuApiKeySecret.value() || "";
    const birth = body.birth || {};
    const normalizedBody = {
      birthYear: Number(birth.year),
      birthMonth: Number(birth.month),
      birthDay: Number(birth.day),
      birthHour: Number(birth.hour),
      birthMinute: Number(birth.minute || 0),
      // SAZU API 기본값: false(남성). 프론트에서 없으면 기본값 사용.
      isFemale: Boolean(body.isFemale),
      timezone: birth.timezone || "Asia/Seoul",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify(normalizedBody),
        signal: controller.signal,
      });

      const data = await upstream.json().catch(() => null);
      res.status(upstream.status).json(
        upstream.ok
          ? { ok: true, data }
          : {
              ok: false,
              message: (data && typeof data.message === "string" && data.message) || "SAZU request failed",
              endpoint,
              data,
            },
      );
    } catch (error) {
      res.status(502).json({
        ok: false,
        endpoint,
        message:
          error && typeof error === "object" && error.name === "AbortError"
            ? "SAZU request timeout"
            : "SAZU proxy error",
      });
    } finally {
      clearTimeout(timeout);
    }
  },
);

/** Hosting `/api/slip/scan` → Cloud Run 슬립 OMR 프록시 */
exports.slipOmrScan = onRequest(
  {
    region: "asia-northeast3",
    secrets: [slipOmrUrlSecret],
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, message: "Method not allowed" });
      return;
    }

    const baseUrl =
      slipOmrUrlSecret.value()?.trim() ||
      (process.env.SLIP_OMR_URL && process.env.SLIP_OMR_URL.trim()) ||
      "";
    if (!baseUrl) {
      res.status(503).json({
        ok: false,
        code: "not_configured",
        message: "슬립 OMR 서버가 설정되지 않았습니다.",
      });
      return;
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/scan`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
        signal: controller.signal,
      });
      const data = await upstream.json().catch(() => null);
      res.status(upstream.status).json(data ?? { ok: false, message: "Invalid upstream response" });
    } catch (error) {
      res.status(502).json({
        ok: false,
        code: "proxy_error",
        message:
          error && typeof error === "object" && error.name === "AbortError"
            ? "OMR request timeout"
            : "OMR proxy error",
      });
    } finally {
      clearTimeout(timeout);
    }
  },
);

/** Hosting `/api/ebay/**` → eBay OAuth + Inventory API */
exports.ebayApi = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    setEbayCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const { handleEbayRequest } = await import("./lib/ebay/handlers.mjs");
    await handleEbayRequest(req, res, {
      clientId: ebayClientIdParam,
      clientSecret: ebayClientSecretParam,
      redirectUri: ebayRedirectUriParam,
      env: ebayEnvParam,
      appOrigin: ebayAppOriginParam,
    });
  },
);

/** Hosting `/api/lotto/**` → 동행복권/pyony 프록시 (브라우저 CORS 우회) */
exports.lottoApi = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const subPath = parseLottoPath(req);

    try {
      if (req.method === "POST" && (subPath === "store" || subPath.endsWith("/store"))) {
        res.status(204).send("");
        return;
      }

      if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      if (subPath === "latest" || subPath.endsWith("/latest")) {
        const latest = await findLatestRound();
        if (!latest) {
          res.status(503).json({ error: "최신 회차를 불러올 수 없습니다" });
          return;
        }
        res.json(latest);
        return;
      }

      if (subPath === "batch" || subPath.startsWith("batch")) {
        const from = Number(req.query.from);
        const to = Number(req.query.to);
        if (!from || !to || from > to || to - from > 200) {
          res.status(400).json({ error: "올바른 from/to 범위를 입력하세요 (최대 200)" });
          return;
        }
        const rounds = [];
        for (let n = from; n <= to; n++) {
          const round = await fetchRound(n);
          if (!round) break;
          rounds.push(round);
        }
        res.json(rounds);
        return;
      }

      const detailMatch = subPath.match(/^detail\/(\d+)$/);
      if (detailMatch) {
        const drwNo = Number(detailMatch[1]);
        const { fetchRoundDetail, fetchWinStores } = await getLottoDetailModule();
        const [detail, stores1, stores2] = await Promise.all([
          fetchRoundDetail(drwNo),
          fetchWinStores(drwNo, 1),
          fetchWinStores(drwNo, 2),
        ]);
        if (!detail && stores1.length === 0 && stores2.length === 0) {
          res.status(404).json({ error: "회차 상세 정보를 찾을 수 없습니다" });
          return;
        }
        res.json({
          drwNo,
          drwNoDate: detail?.drwNoDate ?? "",
          totalSales: detail?.totalSales,
          prizes: detail?.prizes ?? [],
          stores1,
          stores2,
        });
        return;
      }

      const storesMatch = subPath.match(/^stores\/(\d+)$/);
      if (storesMatch) {
        const drwNo = Number(storesMatch[1]);
        const rank = Number(req.query.rank) === 2 ? 2 : 1;
        const { fetchWinStores } = await getLottoDetailModule();
        const stores = await fetchWinStores(drwNo, rank);
        res.json({ drwNo, rank, stores });
        return;
      }

      const drwNo = Number(subPath.split("/")[0]);
      if (!Number.isInteger(drwNo) || drwNo < 1) {
        res.status(400).json({ error: "회차 번호가 올바르지 않습니다" });
        return;
      }
      const round = await fetchRound(drwNo);
      if (!round) {
        res.status(404).json({ error: "회차 데이터를 찾을 수 없습니다" });
        return;
      }
      res.json(round);
    } catch (error) {
      res.status(502).json({
        error: "lotto proxy error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

/** Hosting `/api/auth/password-reset` → 앱 직접 링크로 비밀번호 재설정 메일 발송 */
exports.passwordResetEmail = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 20,
    memory: "256MiB",
  },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, message: "Method not allowed" });
      return;
    }

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      res.status(400).json({ ok: false, message: "올바른 이메일을 입력해 주세요." });
      return;
    }

    const resendApiKey = resendApiKeyParam.value()?.trim();
    const resendFromEmail = resendFromEmailParam.value()?.trim() || "onboarding@resend.dev";

    try {
      const firebaseLink = await getAdminAuth().generatePasswordResetLink(email, {
        url: PASSWORD_RESET_CONTINUE_URL,
      });
      const resetUrl = buildDirectPasswordResetUrl(firebaseLink);
      let emailed = false;

      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const { error } = await resend.emails.send({
          from: resendFromEmail,
          to: email,
          subject: "로또킹 비밀번호 재설정 안내",
          html: buildPasswordResetEmailHtml(resetUrl),
        });
        if (error) {
          console.error("passwordResetEmail resend error", error);
        } else {
          emailed = true;
        }
      }

      res.json({ ok: true, resetUrl, emailed });
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "auth/user-not-found") {
        res.json({ ok: true });
        return;
      }
      console.error("passwordResetEmail error", error);
      res.status(500).json({ ok: false, message: "비밀번호 재설정 요청에 실패했습니다." });
    }
  },
);

/** Hosting `/api/admin/**` → 관리자 API */
exports.adminApi = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const auth = getAdminAuth();
    const adminCheck = await verifyAdminRequest(req, auth, adminEmailsParam.value());
    if (!adminCheck.ok) {
      res.status(adminCheck.status).json({ ok: false, message: adminCheck.message });
      return;
    }

    const subPath = parseAdminPath(req);
    const db = getAdminDb();

    try {
      if (req.method === "GET" && (subPath === "stats" || subPath === "")) {
        const stats = await getAdminStats(db, auth);
        res.json(stats);
        return;
      }

      if (req.method === "GET" && subPath === "wish-phrases") {
        const data = await getWishPhrases(db);
        res.json(data);
        return;
      }

      if (req.method === "PUT" && subPath === "wish-phrases") {
        const result = await saveWishPhrases(db, req.body?.categories, adminCheck.email);
        if (!result.ok) {
          res.status(result.status).json({ ok: false, message: result.message });
          return;
        }
        res.json({ ok: true });
        return;
      }

      if (req.method === "POST" && subPath === "wish-phrases/reset") {
        await resetWishPhrases(db);
        res.json({ ok: true });
        return;
      }

      if (req.method === "GET" && subPath === "engagement-campaigns") {
        const data = await getEngagementCampaigns(db);
        res.json(data);
        return;
      }

      if (req.method === "PUT" && subPath === "engagement-campaigns") {
        const result = await saveEngagementCampaigns(
          db,
          req.body?.campaigns,
          adminCheck.email,
        );
        if (!result.ok) {
          res.status(result.status).json({ ok: false, message: result.message });
          return;
        }
        res.json({ ok: true });
        return;
      }

      if (req.method === "POST" && subPath === "engagement-campaigns/reset") {
        await resetEngagementCampaigns(db);
        res.json({ ok: true });
        return;
      }

      if (req.method === "GET" && subPath === "push/targets") {
        const currentDeviceId = String(req.query.currentDeviceId ?? "").trim();
        const data = await getPushTargets(db, adminCheck.uid, currentDeviceId);
        res.json(data);
        return;
      }

      if (req.method === "POST" && subPath === "push/sync-device") {
        const deviceId = String(req.body?.deviceId ?? "").trim();
        const result = await syncDeviceToAccount(db, adminCheck.uid, deviceId);
        if (!result.ok && result.status) {
          res.status(result.status).json({ ok: false, message: result.message });
          return;
        }
        res.json(result);
        return;
      }

      if (req.method === "POST" && subPath === "push/test") {
        const messaging = getAdminMessaging();
        const result = await sendTestPush(db, messaging, adminCheck, req.body ?? {});
        if (!result.ok && result.status) {
          res.status(result.status).json({ ok: false, message: result.message });
          return;
        }
        res.json(result);
        return;
      }

      res.status(404).json({ ok: false, message: "Not found" });
    } catch (error) {
      console.error("adminApi error", error);
      res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : "관리자 API 오류",
      });
    }
  },
);

async function refreshLottoSyncCache() {
  const { buildLottoSyncPayload } = await import("./lib/lottoSyncCache.mjs");
  const payload = await buildLottoSyncPayload(fetchRound, findLatestRound);
  await getAdminDb().doc("appConfig/lottoSync").set(payload, { merge: true });
  console.log(`lottoSync cached: ${payload.latestDrwNo}회 (${payload.rounds.length} rounds)`);
  return payload;
}

async function refreshLottoDetailSyncCache() {
  const { fetchRoundDetail, fetchWinStores } = await getLottoDetailModule();
  const { buildLottoDetailSyncPayload } = await import("./lib/lottoDetailSyncCache.mjs");
  const payload = await buildLottoDetailSyncPayload(
    findLatestRound,
    fetchRoundDetail,
    fetchWinStores,
  );
  await getAdminDb().doc("appConfig/lottoDetailSync").set(payload, { merge: true });
  const roundKeys = Object.keys(payload.rounds);
  console.log(
    `lottoDetailSync cached: ${payload.latestDrwNo}회 (${roundKeys.length} detail rounds)`,
  );
  return payload;
}

async function refreshLottoFirestoreCaches() {
  await refreshLottoSyncCache();
  await refreshLottoDetailSyncCache();
}

function isSaturdayDrawWindow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (weekday !== "Sat") return false;
  if (hour < 20 || hour > 23) return false;
  // 추첨 종료~API 반영 시작 직후(약 20:35)부터 폴링
  if (hour === 20 && minute < 35) return false;
  return true;
}

function isDetailComplete(entry) {
  if (!entry) return false;
  const hasPrizes = Array.isArray(entry.prizes) && entry.prizes.length > 0;
  const hasStores =
    (Array.isArray(entry.stores1) && entry.stores1.length > 0) ||
    (Array.isArray(entry.stores2) && entry.stores2.length > 0);
  return hasPrizes && hasStores;
}

async function writeLottoSyncMeta(patch) {
  try {
    await getAdminDb()
      .doc("appConfig/lottoSyncMeta")
      .set(
        {
          ...patch,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
  } catch (error) {
    console.warn("lottoSyncMeta write failed", error);
  }
}

/**
 * 새 회차 번호가 Firestore에 있으면 알림 체인 실행.
 * 실패해도 sync는 유지. notifiedDrwNo로 회차 단위 중복 방지 (유저/기기 로그도 이중 방어).
 * @param {object} round
 * @param {{ numbersJustUpdated?: boolean }} [opts]
 */
async function maybeRunPostDrawNotifications(round, opts = {}) {
  const { numbersJustUpdated = false } = opts;
  if (!round?.drwNo) return { skipped: true, reason: "no-round" };

  const metaSnap = await getAdminDb().doc("appConfig/lottoSyncMeta").get();
  const meta = metaSnap.data() ?? {};
  const hasNotifiedField = meta.notifiedDrwNo != null && meta.notifiedDrwNo !== "";
  const notifiedDrwNo = Number(meta.notifiedDrwNo) || 0;
  const pendingDrwNo = Number(meta.notifyPendingDrwNo) || 0;

  if (hasNotifiedField && round.drwNo <= notifiedDrwNo) {
    return { skipped: true, reason: "already_notified", notifiedDrwNo };
  }

  // 배포 직후 첫 실행: 이미 반영된 과거 회차에 재발송하지 않음
  // (실패 재시도 중이면 notifyPendingDrwNo가 있어 bootstrap 생략)
  if (!hasNotifiedField && !numbersJustUpdated && pendingDrwNo !== round.drwNo) {
    await writeLottoSyncMeta({
      notifiedDrwNo: round.drwNo,
      notifyPendingDrwNo: null,
      note: "notify_bootstrap_no_send",
    });
    console.log(`post-draw notify bootstrap: mark ${round.drwNo}회 as notified (no send)`);
    return { skipped: true, reason: "bootstrap" };
  }

  await writeLottoSyncMeta({ notifyPendingDrwNo: round.drwNo });

  try {
    const { runPostDrawNotifications } = await import("./lib/runPostDrawNotifications.mjs");
    const result = await runPostDrawNotifications({
      db: getAdminDb(),
      auth: getAdminAuth(),
      messaging: getAdminMessaging(),
      round,
      resendApiKey: resendApiKeyParam.value()?.trim() || "",
      resendFromEmail: resendFromEmailParam.value()?.trim() || "onboarding@resend.dev",
    });
    await writeLottoSyncMeta({
      notifiedDrwNo: round.drwNo,
      notifyPendingDrwNo: null,
      lastNotifyAt: new Date().toISOString(),
      lastNotifyError: null,
      lastNotifySummary: {
        winners: result.winners?.notified ?? 0,
        deviceWins: result.deviceWins?.notified ?? 0,
        engagement: result.engagement?.sent ?? 0,
      },
    });
    console.log(`post-draw notify ok for ${round.drwNo}회`, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`post-draw notify failed for ${round.drwNo}회`, error);
    await writeLottoSyncMeta({ lastNotifyError: message });
    // notifyPendingDrwNo 유지 → 다음 스케줄에서 재시도
    return { failed: true, error: message };
  }
}

async function scheduledLottoSyncHandler() {
  if (!isSaturdayDrawWindow()) {
    console.log("scheduledLottoSync: outside Saturday draw window, skip");
    return;
  }

  await writeLottoSyncMeta({ lastAttemptAt: new Date().toISOString() });

  const latest = await findLatestRound();
  if (!latest) {
    console.log("scheduledLottoSync: latest round not available yet");
    await writeLottoSyncMeta({ lastError: "latest_unavailable" });
    return;
  }

  const db = getAdminDb();
  const [syncSnap, detailSnap] = await Promise.all([
    db.doc("appConfig/lottoSync").get(),
    db.doc("appConfig/lottoDetailSync").get(),
  ]);
  const cachedSyncLatest = Number(syncSnap.data()?.latestDrwNo) || 0;
  const detailRounds = detailSnap.data()?.rounds ?? {};
  const latestDetail = detailRounds[String(latest.drwNo)];
  const detailComplete = isDetailComplete(latestDetail);
  const numbersUpdated = latest.drwNo > cachedSyncLatest;

  if (numbersUpdated) {
    await refreshLottoSyncCache();
    console.log(`scheduledLottoSync: numbers updated to ${latest.drwNo}회`);
    await writeLottoSyncMeta({
      lastSuccessDrwNo: latest.drwNo,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
    });
  }

  if (numbersUpdated || !detailComplete) {
    await refreshLottoDetailSyncCache();
    console.log(`scheduledLottoSync: detail refresh for ${latest.drwNo}회`);
  } else {
    console.log(`scheduledLottoSync: ${latest.drwNo}회 already complete, skip refresh`);
  }

  await maybeRunPostDrawNotifications(latest, { numbersJustUpdated: numbersUpdated });
}

/**
 * 토요 추첨 직후 — 동행복권 API 오픈 즉시 Firestore 반영.
 * 20:35~20:59·21시 매분, 22시 2분 간격, 일요 재시도.
 */
exports.scheduledLottoSyncSat20 = onSchedule(
  {
    schedule: "35-59 20 * * 6",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  scheduledLottoSyncHandler,
);

exports.scheduledLottoSyncSat21 = onSchedule(
  {
    schedule: "* 21 * * 6",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  scheduledLottoSyncHandler,
);

exports.scheduledLottoSyncSat22 = onSchedule(
  {
    schedule: "*/2 22 * * 6",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  scheduledLottoSyncHandler,
);

exports.scheduledLottoSyncSun0900 = onSchedule(
  { schedule: "0 9 * * 0", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    await refreshLottoFirestoreCaches();
    const latest = await findLatestRound();
    if (latest) await maybeRunPostDrawNotifications(latest);
    await writeLottoSyncMeta({
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
      note: "sunday_0900_refresh",
    });
  },
);

exports.scheduledLottoSyncSun2100 = onSchedule(
  { schedule: "0 21 * * 0", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    await refreshLottoFirestoreCaches();
    const latest = await findLatestRound();
    if (latest) await maybeRunPostDrawNotifications(latest);
    await writeLottoSyncMeta({
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
      note: "sunday_2100_refresh",
    });
  },
);
