/**
 * 빌드 시 public/lotto-sync.json 생성 — 배포 사이트에서 최신 회차 fetch용 (same-origin)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const OUT_PATH = resolve(ROOT, "artifacts/lotto-app/public/lotto-sync.json");
const TAIL_COUNT = 60;

const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error("lottoData.json is empty");
}

const latestDrwNo = Math.max(...rows.map((r) => r.drwNo));
const rounds = rows.filter((r) => r.drwNo >= latestDrwNo - TAIL_COUNT + 1);

writeFileSync(
  OUT_PATH,
  `${JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      latestDrwNo,
      rounds,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Wrote lotto-sync.json (latest ${latestDrwNo}회, ${rounds.length} rounds)`);
