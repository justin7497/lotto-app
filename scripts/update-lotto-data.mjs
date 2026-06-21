/**
 * 동행복권 API(또는 pyony 폴백)에서 최신 회차까지 가져와 lottoData.json을 갱신합니다.
 * 빌드 전에 실행: node scripts/update-lotto-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const DHLOTTERY_URL =
  "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
  "X-Requested-With": "XMLHttpRequest",
};

async function fetchFromDhlottery(drwNo) {
  try {
    const res = await fetch(`${DHLOTTERY_URL}${drwNo}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) return null;
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
      signal: AbortSignal.timeout(12000),
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
  return (await fetchFromDhlottery(drwNo)) ?? (await fetchFromPyony(drwNo));
}

async function findLatestDrwNo(hint) {
  let lo = Math.max(1, hint - 5);
  let hi = hint + 30;
  let latest = null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = await fetchRound(mid);
    if (r) {
      latest = r;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return latest;
}

function loadData() {
  const raw = readFileSync(DATA_PATH, "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("lottoData.json must be an array");
  return rows;
}

function saveData(rows) {
  writeFileSync(DATA_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

/** @returns {Promise<{ added: number, latestDrwNo: number, total: number }>} */
export async function updateLottoData() {
  const existing = loadData();
  const byNo = new Map(existing.map((r) => [r.drwNo, r]));
  const baseMax = Math.max(...existing.map((r) => r.drwNo));

  console.log(`Current max round in JSON: ${baseMax}`);

  const latest = await findLatestDrwNo(baseMax);
  if (!latest) {
    throw new Error("Could not fetch latest round (dhlottery + pyony both failed)");
  }

  console.log(`Latest draw on API: ${latest.drwNo} (${latest.drwNoDate})`);

  let added = 0;
  for (let n = baseMax + 1; n <= latest.drwNo; n += 1) {
    if (byNo.has(n)) continue;
    const r = n === latest.drwNo ? latest : await fetchRound(n);
    if (!r) break;
    byNo.set(r.drwNo, r);
    added += 1;
    console.log(`  + ${r.drwNo}회 ${r.drwNoDate}`);
  }

  const merged = [...byNo.values()].sort((a, b) => a.drwNo - b.drwNo);
  saveData(merged);

  if (added === 0) {
    console.log("Already up to date.");
  } else {
    console.log(`Done. Added ${added} round(s). Total: ${merged.length} rounds.`);
  }

  return { added, latestDrwNo: latest.drwNo, total: merged.length };
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  updateLottoData().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
