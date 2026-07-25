/**
 * 빌드 시 public/lotto-prizes-sync.json 생성 — 앱 내 등수별 당첨금 조회용
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRoundDetail } from "../functions/lib/lottoDetail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const OUT_PATH = resolve(ROOT, "artifacts/lotto-app/public/lotto-prizes-sync.json");
const TAIL_COUNT = 60;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function loadExistingRounds() {
  if (!existsSync(OUT_PATH)) return {};
  try {
    const data = JSON.parse(readFileSync(OUT_PATH, "utf8"));
    return data.rounds ?? {};
  } catch {
    return {};
  }
}

function pickPrizeEntry(fetched, previous) {
  if (fetched?.prizes?.length) {
    return {
      drwNo: fetched.drwNo,
      drwNoDate: fetched.drwNoDate,
      totalSales: fetched.totalSales,
      prizes: fetched.prizes,
    };
  }
  if (previous?.prizes?.length) return previous;
  return null;
}

function shouldRefetchPrizes(drwNo, prev, latestDrwNo) {
  if (drwNo >= latestDrwNo - 1) return true;
  return !prev?.prizes?.length;
}

const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error("lottoData.json is empty");
}

const existingRounds = loadExistingRounds();
const latestDrwNo = Math.max(...rows.map((r) => r.drwNo));
const fromDrwNo = Math.max(1, latestDrwNo - TAIL_COUNT + 1);
const rounds = { ...existingRounds };

let fetchedCount = 0;
let keptPreviousCount = 0;

for (let drwNo = fromDrwNo; drwNo <= latestDrwNo; drwNo += 1) {
  const key = String(drwNo);
  const prev = rounds[key];

  if (!shouldRefetchPrizes(drwNo, prev, latestDrwNo)) {
    keptPreviousCount += 1;
    process.stdout.write(`prizes ${drwNo}: cached (${prev.prizes.length} ranks)\n`);
    continue;
  }

  const detail = await fetchRoundDetail(drwNo);
  const entry = pickPrizeEntry(detail, prev);
  if (entry) {
    rounds[key] = entry;
    if (detail?.prizes?.length) fetchedCount += 1;
    else if (prev?.prizes?.length) keptPreviousCount += 1;
    process.stdout.write(`prizes ${drwNo}: ok (${entry.prizes.length} ranks)\n`);
  } else {
    process.stdout.write(`prizes ${drwNo}: skip\n`);
  }
  await sleep(80);
}

const latestEntry = rounds[String(latestDrwNo)];
if (!latestEntry?.prizes?.length) {
  throw new Error(
    `lotto-prizes-sync.json: latest round ${latestDrwNo} has no prize data. Check dhlottery API access.`,
  );
}

const filledInRange = Object.keys(rounds).filter((k) => {
  const n = Number(k);
  return n >= fromDrwNo && n <= latestDrwNo && rounds[k]?.prizes?.length;
}).length;

if (filledInRange < Math.min(TAIL_COUNT, latestDrwNo - fromDrwNo + 1) * 0.5) {
  throw new Error(
    `lotto-prizes-sync.json: only ${filledInRange} rounds in tail range have prizes (fetched ${fetchedCount}, kept ${keptPreviousCount})`,
  );
}

writeFileSync(
  OUT_PATH,
  `${JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      latestDrwNo,
      fromDrwNo,
      rounds,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Wrote lotto-prizes-sync.json (${fromDrwNo}~${latestDrwNo}회, ${filledInRange} rounds with prizes)`,
);
