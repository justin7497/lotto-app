/**
 * 빌드 시 public/lotto-stores-sync.json 생성 — 앱 내 1·2등 판매점 조회용
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWinStores } from "../functions/lib/lottoDetail.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const OUT_PATH = resolve(ROOT, "artifacts/lotto-app/public/lotto-stores-sync.json");
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

function pickStores(fetched, previous) {
  if (fetched.length > 0) return fetched;
  return previous?.length ? previous : [];
}

function shouldRefetchStores(drwNo, prev, latestDrwNo) {
  if (drwNo >= latestDrwNo - 1) return true;
  return !(prev?.stores1?.length && prev?.stores2?.length);
}

const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error("lottoData.json is empty");
}

const existingRounds = loadExistingRounds();
const latestDrwNo = Math.max(...rows.map((r) => r.drwNo));
const fromDrwNo = Math.max(1, latestDrwNo - TAIL_COUNT + 1);
const rounds = { ...existingRounds };

for (let drwNo = fromDrwNo; drwNo <= latestDrwNo; drwNo += 1) {
  const key = String(drwNo);
  const prev = rounds[key] ?? {};

  if (!shouldRefetchStores(drwNo, prev, latestDrwNo)) {
    process.stdout.write(
      `stores ${drwNo}: cached (1등 ${prev.stores1?.length ?? 0}, 2등 ${prev.stores2?.length ?? 0})\n`,
    );
    continue;
  }

  const [fetched1, fetched2] = await Promise.all([
    fetchWinStores(drwNo, 1),
    fetchWinStores(drwNo, 2),
  ]);
  const stores1 = pickStores(fetched1, prev.stores1);
  const stores2 = pickStores(fetched2, prev.stores2);
  rounds[key] = { stores1, stores2 };
  process.stdout.write(`stores ${drwNo}: 1등 ${stores1.length}, 2등 ${stores2.length}\n`);
  await sleep(80);
}

const latestStores = rounds[String(latestDrwNo)];
if (!latestStores?.stores1?.length) {
  throw new Error(
    `lotto-stores-sync.json: latest round ${latestDrwNo} has no 1등 store data. Check dhlottery/pyony API access.`,
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

console.log(`Wrote lotto-stores-sync.json (${fromDrwNo}~${latestDrwNo}회)`);
