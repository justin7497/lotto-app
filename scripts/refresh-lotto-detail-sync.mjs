/**
 * Firestore appConfig/lottoDetailSync 갱신 (최신 3회차 당첨금·판매점)
 *
 * 사용: node scripts/refresh-lotto-detail-sync.mjs
 * 환경: FIREBASE_SERVICE_ACCOUNT_JSON 또는 GOOGLE_APPLICATION_CREDENTIALS
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { fetchRoundDetail, fetchWinStores } from "../functions/lib/lottoDetail.mjs";
import { buildLottoDetailSyncPayload } from "../functions/lib/lottoDetailSyncCache.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CRED_PATH = resolve(ROOT, ".secrets/firebase-adminsdk.json");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const DHLOTTERY_URL =
  "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
};

function initFirebase() {
  if (getApps().length > 0) return getFirestore();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    initializeApp({ credential: cert(JSON.parse(raw)) });
    return getFirestore();
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp();
    return getFirestore();
  }

  if (existsSync(CRED_PATH)) {
    const json = JSON.parse(readFileSync(CRED_PATH, "utf8"));
    initializeApp({ credential: cert(json) });
    return getFirestore();
  }

  throw new Error(
    "Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.",
  );
}

async function fetchFromDhlottery(drwNo) {
  try {
    const res = await fetch(`${DHLOTTERY_URL}${drwNo}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim().startsWith("{")) return null;
    const data = JSON.parse(text);
    if (data.returnValue !== "success") return null;
    return { drwNo: data.drwNo };
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
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html.includes(`${drwNo}회`)) return null;
    return { drwNo };
  } catch {
    return null;
  }
}

async function fetchRoundHint(drwNo) {
  return (await fetchFromDhlottery(drwNo)) ?? (await fetchFromPyony(drwNo));
}

function loadLatestHint() {
  try {
    const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
    if (!Array.isArray(rows) || rows.length === 0) return 1200;
    return Math.max(...rows.map((r) => r.drwNo));
  } catch {
    return 1200;
  }
}

async function findLatestRound() {
  const hint = loadLatestHint();
  let lo = Math.max(1, hint - 3);
  let hi = hint + 10;
  let latest = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const round = await fetchRoundHint(mid);
    if (round) {
      latest = round;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return latest;
}

async function main() {
  const db = initFirebase();
  const payload = await buildLottoDetailSyncPayload(
    findLatestRound,
    fetchRoundDetail,
    fetchWinStores,
  );
  await db.doc("appConfig/lottoDetailSync").set(payload, { merge: true });

  const keys = Object.keys(payload.rounds);
  for (const key of keys) {
    const entry = payload.rounds[key];
    console.log(
      `  ${key}회: prizes=${entry.prizes.length}, stores1=${entry.stores1.length}, stores2=${entry.stores2.length}`,
    );
  }
  console.log(`Wrote lottoDetailSync (${payload.latestDrwNo}회, ${keys.length} rounds)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
