const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const sazuApiKeySecret = defineSecret("SAZU_API_KEY");
const slipOmrUrlSecret = defineSecret("SLIP_OMR_URL");

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
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Cache-Control", "public, max-age=60");
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
