/**
 * store-win-stats.json roundWins를 새 통계 키로 재집계 (API 재호출 없음)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { storeStatsKey } from "./lib/storeStatsKey.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = resolve(ROOT, "artifacts/lotto-app/public/store-win-stats.json");

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

const data = JSON.parse(readFileSync(OUT_PATH, "utf8"));
const roundWins = data.roundWins ?? {};
const entries = accumulateEntries(roundWins);

writeFileSync(
  OUT_PATH,
  `${JSON.stringify(
    {
      ...data,
      updatedAt: new Date().toISOString(),
      entries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const spa = Object.entries(entries).filter(([, entry]) => entry.name === "스파");
spa.sort((a, b) => b[1].rank1 - a[1].rank1);
console.log("Re-aggregated store-win-stats.json");
console.log("스파 top:", spa.slice(0, 5).map(([, e]) => `${e.rank1}등1/${e.rank2}등2 ${e.address}`));
