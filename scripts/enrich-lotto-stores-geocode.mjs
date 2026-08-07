/**
 * lotto-stores-sync.json 판매점 주소 → 좌표 캐시 (Google Geocoding)
 * store-geocode-cache.json에 영구 저장, 신규 주소만 API 호출
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachCoordsToStore,
  collectUniqueAddresses,
  geocodeAddress,
  geocodeCacheKey,
  readGoogleMapsApiKey,
} from "./lib/storeGeocode.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORES_PATH = resolve(ROOT, "artifacts/lotto-app/public/lotto-stores-sync.json");
const CACHE_PATH = resolve(ROOT, "artifacts/lotto-app/public/store-geocode-cache.json");
const MAX_NEW_PER_RUN = 500;
const GEOCODE_DELAY_MS = 120;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) {
    return { updatedAt: null, entries: {} };
  }
  try {
    const data = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
    return { updatedAt: data.updatedAt ?? null, entries: data.entries ?? {} };
  } catch {
    return { updatedAt: null, entries: {} };
  }
}

const storesData = JSON.parse(readFileSync(STORES_PATH, "utf8"));
const cache = loadCache();
const apiKey = readGoogleMapsApiKey();
const uniqueAddresses = collectUniqueAddresses(storesData.rounds);

let newGeocoded = 0;
let skipped = 0;
let failed = 0;

if (!apiKey) {
  process.stdout.write(
    "geocode: VITE_GOOGLE_MAPS_API_KEY 없음 — 캐시만 병합, 신규 지오코딩 생략\n",
  );
} else {
  for (const address of uniqueAddresses) {
    const key = geocodeCacheKey(address);
    const existing = cache.entries[key];
    if (existing?.lat && existing?.lng) {
      skipped += 1;
      continue;
    }
    if (newGeocoded >= MAX_NEW_PER_RUN) {
      process.stdout.write(
        `geocode: 이번 실행 신규 한도(${MAX_NEW_PER_RUN}건) 도달 — 나머지는 다음 빌드에서 처리\n`,
      );
      break;
    }

    const result = await geocodeAddress(address, apiKey);
    if (result) {
      cache.entries[key] = {
        address,
        lat: result.lat,
        lng: result.lng,
        formattedAddress: result.formattedAddress,
        geocodedAt: new Date().toISOString(),
        source: "google",
      };
      newGeocoded += 1;
      process.stdout.write(`geocode: ok ${address.slice(0, 40)}…\n`);
    } else {
      failed += 1;
      process.stdout.write(`geocode: fail ${address.slice(0, 40)}…\n`);
    }

    await sleep(GEOCODE_DELAY_MS);
  }
}

cache.updatedAt = new Date().toISOString();
writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");

const enrichedRounds = {};
for (const [drwNo, round] of Object.entries(storesData.rounds ?? {})) {
  enrichedRounds[drwNo] = {
    stores1: (round.stores1 ?? []).map((store) => attachCoordsToStore(store, cache.entries)),
    stores2: (round.stores2 ?? []).map((store) => attachCoordsToStore(store, cache.entries)),
  };
}

writeFileSync(
  STORES_PATH,
  `${JSON.stringify(
    {
      ...storesData,
      geocodeUpdatedAt: cache.updatedAt,
      rounds: enrichedRounds,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const withCoords = Object.values(enrichedRounds).reduce((sum, round) => {
  const physical = [...(round.stores1 ?? []), ...(round.stores2 ?? [])].filter(
    (s) => s.lat != null && s.lng != null,
  );
  return sum + physical.length;
}, 0);

process.stdout.write(
  `geocode: cache ${Object.keys(cache.entries).length} entries, +${newGeocoded} new, ${skipped} cached, ${failed} failed, ${withCoords} store coords in sync\n`,
);
