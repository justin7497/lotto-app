export type Brand = {
  id: string;
  name: string;
};

export const PRESET_BRANDS: Brand[] = [
  { id: "kstarforall", name: "KstarForAll (스토어 배너)" },
  { id: "bts", name: "BTS" },
  { id: "montblanc", name: "Montblanc" },
  { id: "marc-jacobs", name: "Marc Jacobs" },
  { id: "blackpink", name: "BLACKPINK" },
  { id: "seventeen", name: "SEVENTEEN" },
  { id: "stray-kids", name: "Stray Kids" },
  { id: "newjeans", name: "NewJeans" },
  { id: "custom", name: "Custom" },
];

/** 참조 리스팅(WITH_US_STORE) 스토어 배너 예시 */
export const REFERENCE_STORE_BANNER =
  "https://gi.esmplus.com/ryeod1/ebay/manofkorea.jpg";

export const BRAND_STORAGE_KEY = "ebay-description-brand-urls";

export function loadBrandUrls(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY);
    if (!raw) return { kstarforall: REFERENCE_STORE_BANNER };
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed.kstarforall) {
      parsed.kstarforall = parsed.starforall ?? parsed.kpopday ?? REFERENCE_STORE_BANNER;
    }
    return parsed;
  } catch {
    return { kstarforall: REFERENCE_STORE_BANNER };
  }
}

export function saveBrandUrl(brandId: string, url: string) {
  const urls = loadBrandUrls();
  urls[brandId] = url;
  localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(urls));
}

export function getBrandImageUrl(brandId: string): string {
  const saved = loadBrandUrls();
  return saved[brandId]?.trim() ?? "";
}
