const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function illustPublicUrl(src: string): string {
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${basePath}${path}`;
}

export function illustWebpUrl(src: string): string | null {
  if (!/\.png$/i.test(src)) return null;
  const normalized = src.startsWith("/") ? src : `/${src}`;
  // 메뉴 일러스트만 WebP 생성 (optimize-illustrations). 앱 아이콘·로고는 PNG만 사용.
  if (!normalized.startsWith("/illustrations/")) return null;
  return illustPublicUrl(normalized.replace(/\.png$/i, ".webp"));
}
