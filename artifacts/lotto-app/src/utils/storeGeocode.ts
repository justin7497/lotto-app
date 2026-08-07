import type { LottoWinStore } from "@/data/types";
import { isPhysicalLottoStore } from "@/utils/googleMap";

const METRO_PREFIX =
  /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;

export function normalizeStoreAddress(address: string): string {
  return address.replace(/\s+/g, " ").trim();
}

/** 지번/도로명/괄호 등 표기 차이를 통합하는 판매점 통계 키 */
export function fingerprintStoreAddress(address: string): string {
  let compact = normalizeStoreAddress(address)
    .replace(/\([^)]*\)/g, " ")
    .replace(/번지/g, "")
    .replace(/\s+/g, "");

  const metro = compact.match(METRO_PREFIX)?.[1] ?? "";
  const district =
    compact.match(
      /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)([가-힣]+(?:구|시|군))/,
    )?.[1] ?? "";

  const shopPatterns = [
    /주공\d+단지종합상가\d+/,
    /[가-힣]{1,12}상가\d+/,
    /[가-힣]+(?:로|길)\d+/,
  ];

  for (const pattern of shopPatterns) {
    const match = compact.match(pattern);
    if (match) {
      const token = match[0].replace(/호$/u, "").toLowerCase();
      return `${metro}|${district}|${token}`;
    }
  }

  const lotMatch = compact.match(/([가-힣]+동)(\d+(?:-\d+)?)/);
  if (lotMatch) {
    return `${metro}|${district}|${lotMatch[1]}${lotMatch[2]}`;
  }

  return `raw:${compact.toLowerCase()}`;
}

export function storeStatsKey(store: Pick<LottoWinStore, "address">): string {
  return fingerprintStoreAddress(store.address);
}

export function storeRowKey(store: LottoWinStore, idx: number): string {
  return `${idx}-${store.name}-${store.address}`;
}

export function storeHasCoords(
  store: LottoWinStore,
): store is LottoWinStore & { lat: number; lng: number } {
  return (
    isPhysicalLottoStore(store) &&
    typeof store.lat === "number" &&
    typeof store.lng === "number" &&
    Number.isFinite(store.lat) &&
    Number.isFinite(store.lng)
  );
}

export type MappedWinStore = LottoWinStore & { id: string; lat: number; lng: number };

export function toMappedStores(stores: LottoWinStore[]): MappedWinStore[] {
  const mapped: MappedWinStore[] = [];
  stores.forEach((store, idx) => {
    if (!storeHasCoords(store)) return;
    mapped.push({
      ...store,
      id: storeRowKey(store, idx),
      lat: store.lat,
      lng: store.lng,
    });
  });
  return mapped;
}
