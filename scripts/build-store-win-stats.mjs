/**
 * lotto-stores-sync + API 기준 판매점별 1·2등 회차별 당첨 기록 (1회~최신 누적 집계용)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWinStores } from "../functions/lib/lottoDetail.mjs";
import { isPhysicalStoreAddress } from "./lib/storeGeocode.mjs";
import { storeStatsKey } from "./lib/storeStatsKey.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const STORES_PATH = resolve(ROOT, "artifacts/lotto-app/public/lotto-stores-sync.json");
const OUT_PATH = resolve(ROOT, "artifacts/lotto-app/public/store-win-stats.json");

const BATCH_SIZE = 12;
const BATCH_PAUSE_MS = 40;
const SAVE_EVERY_BATCHES = 4;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function roundWinsFromStores(stores1, stores2) {
  const wins = [];

  for (const store of stores1 ?? []) {
    if (!isPhysicalStoreAddress(store.name, store.address)) continue;
    wins.push({
      address: store.address,
      name: store.name,
      rank1: 1,
      rank2: 0,
    });
  }

  for (const store of stores2 ?? []) {
    if (!isPhysicalStoreAddress(store.name, store.address)) continue;
    wins.push({
      address: store.address,
      name: store.name,
      rank1: 0,
      rank2: 1,
    });
  }

  return wins;
}

function accumulateEntries(roundWins) {
  const entries = {};

  for (const wins of Object.values(roundWins)) {
    for (const win of wins) {
      const key = storeStatsKey(win);
      if (!entries[key]) {
        entries[key] = {
          address: win.address,
          name: win.name,
          rank1: 0,
          rank2: 0,
        };
      }
      entries[key].rank1 += win.rank1;
      entries[key].rank2 += win.rank2;
      entries[key].name = win.name;
    }
  }

  return entries;
}

function writeOutput(roundWins, latestDrwNo) {
  writeFileSync(
    OUT_PATH,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        fromDrwNo: 1,
        latestDrwNo,
        roundWins,
        entries: accumulateEntries(roundWins),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error("lottoData.json is empty");
}

const latestDrwNo = Math.max(...rows.map((row) => row.drwNo));
const storesData = loadJson(STORES_PATH, { rounds: {} });
const existing = loadJson(OUT_PATH, {});
const roundWins = { ...(existing.roundWins ?? {}) };

let fetched = 0;
let cached = 0;
let batchesSinceSave = 0;

for (let drwNo = 1; drwNo <= latestDrwNo; drwNo += 1) {
  const key = String(drwNo);
  if (roundWins[key]) {
    cached += 1;
    continue;
  }

  const syncRound = storesData.rounds?.[key];
  if (syncRound?.stores1?.length || syncRound?.stores2?.length) {
    roundWins[key] = roundWinsFromStores(syncRound.stores1, syncRound.stores2);
    cached += 1;
    continue;
  }
}

const missing = [];
for (let drwNo = 1; drwNo <= latestDrwNo; drwNo += 1) {
  if (!roundWins[String(drwNo)]) missing.push(drwNo);
}

for (let i = 0; i < missing.length; i += BATCH_SIZE) {
  const batch = missing.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(async (drwNo) => {
      const [stores1, stores2] = await Promise.all([
        fetchWinStores(drwNo, 1),
        fetchWinStores(drwNo, 2),
      ]);
      return [drwNo, roundWinsFromStores(stores1, stores2)];
    }),
  );

  for (const [drwNo, wins] of results) {
    roundWins[String(drwNo)] = wins;
    fetched += 1;
  }

  batchesSinceSave += 1;
  const lastInBatch = batch[batch.length - 1];
  process.stdout.write(`store-win-stats: through ${lastInBatch}회 (${fetched} fetched)\n`);

  if (batchesSinceSave >= SAVE_EVERY_BATCHES) {
    writeOutput(roundWins, latestDrwNo);
    batchesSinceSave = 0;
  }

  if (i + BATCH_SIZE < missing.length) {
    await sleep(BATCH_PAUSE_MS);
  }
}

writeOutput(roundWins, latestDrwNo);

console.log(
  `Wrote store-win-stats.json (${Object.keys(roundWins).length} rounds, ${Object.keys(accumulateEntries(roundWins)).length} stores, api=${fetched}, cached=${cached})`,
);
