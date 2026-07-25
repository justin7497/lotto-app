/**
 * 빌드 후 lottoData.json과 public sync 파일의 최신 회차가 일치하는지 검증
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const SYNC_FILES = [
  resolve(ROOT, "artifacts/lotto-app/public/lotto-sync.json"),
  resolve(ROOT, "artifacts/lotto-app/public/lotto-prizes-sync.json"),
  resolve(ROOT, "artifacts/lotto-app/public/lotto-stores-sync.json"),
];

const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
const latestDrwNo = Math.max(...rows.map((r) => r.drwNo));
const key = String(latestDrwNo);

for (const filePath of SYNC_FILES) {
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  if (data.latestDrwNo !== latestDrwNo) {
    throw new Error(`${filePath}: latestDrwNo ${data.latestDrwNo} != lottoData ${latestDrwNo}`);
  }
}

const prizes = JSON.parse(readFileSync(SYNC_FILES[1], "utf8"));
const stores = JSON.parse(readFileSync(SYNC_FILES[2], "utf8"));

if (!prizes.rounds?.[key]?.prizes?.length) {
  throw new Error(`lotto-prizes-sync.json: round ${latestDrwNo} has no prize data`);
}

const latestStores = stores.rounds?.[key];
if (!latestStores?.stores1?.length) {
  throw new Error(`lotto-stores-sync.json: round ${latestDrwNo} has no 1등 stores`);
}

console.log(`Sync verified for round ${latestDrwNo}회 (prizes + 1등 ${latestStores.stores1.length} stores)`);
