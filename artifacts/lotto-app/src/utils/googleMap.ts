import type { LottoWinStore } from "@/data/types";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY?.trim());
}

/** 오프라인 판매점만 지도 대상 (인터넷 구매 등 제외) */
export function isPhysicalLottoStore(store: Pick<LottoWinStore, "name" | "address">): boolean {
  if (store.name.includes("인터넷")) return false;
  if (/dhlottery\.co\.kr/i.test(store.address)) return false;
  return store.address.trim().length >= 4;
}

export function googleMapSearchQuery(store: Pick<LottoWinStore, "name" | "address">): string {
  return `${store.name} ${store.address}`.trim();
}

/** 구글맵 앱/웹에서 열기 (API 키 불필요, 항상 무료) */
export function googleMapOpenUrl(store: Pick<LottoWinStore, "name" | "address">): string {
  const query = googleMapSearchQuery(store);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** 팝업 iframe용 Embed URL (API 키 있으면 공식 Embed API) */
export function googleMapEmbedUrl(store: Pick<LottoWinStore, "name" | "address" | "lat" | "lng">): string {
  const key = GOOGLE_MAPS_API_KEY?.trim();

  if (key && store.lat != null && store.lng != null) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(`${store.lat},${store.lng}`)}&language=ko&zoom=17`;
  }

  const query = googleMapSearchQuery(store);
  if (key) {
    return `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&language=ko`;
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=ko&z=17&output=embed`;
}
