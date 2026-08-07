import type { LottoWinStore } from "@/data/types";
import { isPhysicalLottoStore } from "@/utils/googleMap";
import { storeStatsKey } from "@/utils/storeGeocode";

export interface StoreWinStatEntry {
  address: string;
  name: string;
  rank1: number;
  rank2: number;
}

export interface RoundWinStore {
  address: string;
  name: string;
  rank1: number;
  rank2: number;
}

export interface StoreWinStatsFile {
  updatedAt: string;
  fromDrwNo?: number;
  latestDrwNo?: number;
  roundWins?: Record<string, RoundWinStore[]>;
  entries?: Record<string, StoreWinStatEntry>;
}

let statsFilePromise: Promise<StoreWinStatsFile | null> | null = null;

export async function loadStoreWinStatsFile(): Promise<StoreWinStatsFile | null> {
  if (!statsFilePromise) {
    statsFilePromise = (async () => {
      try {
        const res = await fetch(`/store-win-stats.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as StoreWinStatsFile;
      } catch {
        return null;
      }
    })();
  }
  return statsFilePromise;
}

/** @deprecated Use loadStoreWinStatsFile + computeStoreWinStatsUpTo */
export async function loadStoreWinStats(): Promise<Record<string, StoreWinStatEntry>> {
  const file = await loadStoreWinStatsFile();
  return file?.entries ?? {};
}

function bumpEntry(
  entries: Record<string, StoreWinStatEntry>,
  store: Pick<LottoWinStore, "name" | "address">,
  rank: 1 | 2,
): void {
  const key = storeStatsKey(store);
  if (!entries[key]) {
    entries[key] = {
      address: store.address,
      name: store.name,
      rank1: 0,
      rank2: 0,
    };
  }
  if (rank === 1) entries[key].rank1 += 1;
  else entries[key].rank2 += 1;
  entries[key].name = store.name;
}

export function computeStoreWinStatsUpTo(
  roundWins: Record<string, RoundWinStore[]>,
  upToDrwNo: number,
): Record<string, StoreWinStatEntry> {
  const entries: Record<string, StoreWinStatEntry> = {};

  for (const [drwKey, wins] of Object.entries(roundWins)) {
    const drwNo = Number(drwKey);
    if (!Number.isFinite(drwNo) || drwNo < 1 || drwNo > upToDrwNo) continue;

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

export function computeStoreWinStatsFromSyncRounds(
  rounds: Record<string, { stores1?: LottoWinStore[]; stores2?: LottoWinStore[] }>,
  upToDrwNo: number,
): Record<string, StoreWinStatEntry> {
  const entries: Record<string, StoreWinStatEntry> = {};

  for (const [drwKey, round] of Object.entries(rounds)) {
    const drwNo = Number(drwKey);
    if (!Number.isFinite(drwNo) || drwNo < 1 || drwNo > upToDrwNo) continue;

    for (const store of round.stores1 ?? []) {
      if (!isPhysicalLottoStore(store)) continue;
      bumpEntry(entries, store, 1);
    }
    for (const store of round.stores2 ?? []) {
      if (!isPhysicalLottoStore(store)) continue;
      bumpEntry(entries, store, 2);
    }
  }

  return entries;
}

export function lookupStoreWinStats(
  store: Pick<LottoWinStore, "address">,
  entries: Record<string, StoreWinStatEntry>,
): StoreWinStatEntry | null {
  const key = storeStatsKey(store);
  return entries[key] ?? null;
}

export function formatStoreWinStats(entry: StoreWinStatEntry | null): string | null {
  if (!entry || (entry.rank1 === 0 && entry.rank2 === 0)) return null;
  const parts: string[] = [];
  if (entry.rank1 > 0) parts.push(`1등 ${entry.rank1}회`);
  if (entry.rank2 > 0) parts.push(`2등 ${entry.rank2}회`);
  return parts.join(" · ");
}
