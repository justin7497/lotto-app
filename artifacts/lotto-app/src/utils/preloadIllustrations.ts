const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** 홈·자주 쓰는 일러스트 WebP를 미리 받아 둡니다 */
export function preloadIllustrations(paths: string[]) {
  if (typeof window === "undefined") return;
  for (const path of paths) {
    const webp = path.replace(/\.png$/i, ".webp");
    const img = new Image();
    img.decoding = "async";
    img.src = `${basePath}${webp}`;
  }
}
