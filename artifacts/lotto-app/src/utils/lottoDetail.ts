import type { LottoRoundDetail, LottoWinStore } from "@/data/types";

const CACHE_KEY = "lotto_round_details_v2";

type DetailCache = Record<number, LottoRoundDetail>;

type StoresSyncFile = {
  rounds?: Record<string, { stores1?: LottoWinStore[]; stores2?: LottoWinStore[] }>;
};

type PrizesSyncFile = {
  rounds?: Record<
    string,
    Pick<LottoRoundDetail, "drwNo" | "drwNoDate" | "totalSales" | "prizes">
  >;
};

let storesSyncPromise: Promise<StoresSyncFile["rounds"]> | null = null;
let prizesSyncPromise: Promise<PrizesSyncFile["rounds"]> | null = null;

function readCache(): DetailCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DetailCache;
  } catch {
    return {};
  }
}

function writeCache(cache: DetailCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

async function loadStoresSync(): Promise<StoresSyncFile["rounds"]> {
  if (!storesSyncPromise) {
    storesSyncPromise = (async () => {
      try {
        const res = await fetch(`/lotto-stores-sync.json?t=${Date.now()}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return {};
        const data = (await res.json()) as StoresSyncFile;
        return data.rounds ?? {};
      } catch {
        return {};
      }
    })();
  }
  return storesSyncPromise;
}

async function loadPrizesSync(): Promise<PrizesSyncFile["rounds"]> {
  if (!prizesSyncPromise) {
    prizesSyncPromise = (async () => {
      try {
        const res = await fetch(`/lotto-prizes-sync.json?t=${Date.now()}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return {};
        const data = (await res.json()) as PrizesSyncFile;
        return data.rounds ?? {};
      } catch {
        return {};
      }
    })();
  }
  return prizesSyncPromise;
}

type PrizesRoundEntry = NonNullable<PrizesSyncFile["rounds"]>[string];
type StoresRoundEntry = NonNullable<StoresSyncFile["rounds"]>[string];

function storeMatchKey(store: Pick<LottoWinStore, "name" | "address">): string {
  return `${store.name}::${store.address}`;
}

function enrichStoresWithCoords(
  stores: LottoWinStore[],
  bundledStores?: LottoWinStore[],
): LottoWinStore[] {
  if (!stores.length || !bundledStores?.length) return stores;

  const coordsByKey = new Map<string, Pick<LottoWinStore, "lat" | "lng">>();
  for (const store of bundledStores) {
    if (typeof store.lat !== "number" || typeof store.lng !== "number") continue;
    coordsByKey.set(storeMatchKey(store), { lat: store.lat, lng: store.lng });
  }
  if (coordsByKey.size === 0) return stores;

  return stores.map((store) => {
    const coords = coordsByKey.get(storeMatchKey(store));
    if (!coords || (store.lat != null && store.lng != null)) return store;
    return { ...store, ...coords };
  });
}

function mergeBundled(
  detail: LottoRoundDetail,
  prizesBundled?: PrizesRoundEntry,
  storesBundled?: StoresRoundEntry,
): LottoRoundDetail {
  const stores1 = enrichStoresWithCoords(
    detail.stores1?.length ? detail.stores1 : (storesBundled?.stores1 ?? []),
    storesBundled?.stores1,
  );
  const stores2 = enrichStoresWithCoords(
    detail.stores2?.length ? detail.stores2 : (storesBundled?.stores2 ?? []),
    storesBundled?.stores2,
  );

  return {
    ...detail,
    drwNoDate: detail.drwNoDate || prizesBundled?.drwNoDate || "",
    totalSales: detail.totalSales ?? prizesBundled?.totalSales,
    prizes: detail.prizes?.length ? detail.prizes : (prizesBundled?.prizes ?? []),
    stores1,
    stores2,
  };
}

function detailFromBundled(
  drwNo: number,
  prizesBundled?: PrizesRoundEntry,
  storesBundled?: StoresRoundEntry,
): LottoRoundDetail | null {
  if (!prizesBundled && !storesBundled) return null;
  return mergeBundled(
    {
      drwNo,
      drwNoDate: prizesBundled?.drwNoDate ?? "",
      prizes: prizesBundled?.prizes ?? [],
      stores1: storesBundled?.stores1 ?? [],
      stores2: storesBundled?.stores2 ?? [],
      totalSales: prizesBundled?.totalSales,
    },
    prizesBundled,
    storesBundled,
  );
}

export function getCachedRoundDetail(drwNo: number): LottoRoundDetail | null {
  return readCache()[drwNo] ?? null;
}

export function formatWon(amount: number): string {
  if (!Number.isFinite(amount)) return "-";
  return `${amount.toLocaleString("ko-KR")}원`;
}

async function fetchStoresFromApi(drwNo: number, rank: 1 | 2): Promise<LottoWinStore[]> {
  try {
    const res = await fetch(`/api/lotto/stores/${drwNo}?rank=${rank}`, {
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { stores?: LottoWinStore[] };
    return data.stores ?? [];
  } catch {
    return [];
  }
}

async function fillMissingStores(
  detail: LottoRoundDetail,
  drwNo: number,
): Promise<LottoRoundDetail> {
  let stores1 = detail.stores1 ?? [];
  let stores2 = detail.stores2 ?? [];

  if (!stores1.length) {
    stores1 = await fetchStoresFromApi(drwNo, 1);
  }
  if (!stores2.length) {
    stores2 = await fetchStoresFromApi(drwNo, 2);
  }

  if (stores1.length === detail.stores1?.length && stores2.length === detail.stores2?.length) {
    return detail;
  }

  return { ...detail, stores1, stores2 };
}

export async function fetchRoundDetail(drwNo: number): Promise<LottoRoundDetail | null> {
  const [prizesSync, storesSync] = await Promise.all([loadPrizesSync(), loadStoresSync()]);
  const prizesBundled = prizesSync?.[String(drwNo)];
  const storesBundled = storesSync?.[String(drwNo)];
  const cached = getCachedRoundDetail(drwNo);

  if (cached?.prizes?.length) {
    const merged = mergeBundled(cached, prizesBundled, storesBundled);
    return fillMissingStores(merged, drwNo);
  }

  const bundledOnly = detailFromBundled(drwNo, prizesBundled, storesBundled);
  if (bundledOnly?.prizes?.length) {
    const filled = await fillMissingStores(bundledOnly, drwNo);
    writeCache({ ...readCache(), [drwNo]: filled });
    return filled;
  }

  try {
    const res = await fetch(`/api/lotto/detail/${drwNo}`, {
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const fallback = bundledOnly ?? cached;
      return fallback ? fillMissingStores(fallback, drwNo) : null;
    }
    const data = (await res.json()) as LottoRoundDetail;
    if (typeof data?.drwNo !== "number") {
      const fallback = bundledOnly ?? cached;
      return fallback ? fillMissingStores(fallback, drwNo) : null;
    }

    const merged = await fillMissingStores(
      mergeBundled(data, prizesBundled, storesBundled),
      drwNo,
    );
    const cache = readCache();
    cache[drwNo] = merged;
    writeCache(cache);
    return merged;
  } catch {
    const fallback = bundledOnly ?? cached;
    return fallback ? fillMissingStores(fallback, drwNo) : null;
  }
}

export async function fetchRoundStores(
  drwNo: number,
  rank: 1 | 2,
): Promise<LottoWinStore[]> {
  const detail = await fetchRoundDetail(drwNo);
  if (!detail) return [];
  return rank === 1 ? (detail.stores1 ?? []) : (detail.stores2 ?? []);
}
