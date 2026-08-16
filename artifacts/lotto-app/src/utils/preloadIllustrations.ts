import { illustWebpUrl } from "@/utils/illustUrl";

/** 홈·자주 쓰는 일러스트 WebP를 미리 받아 둡니다 */
export function preloadIllustrations(paths: string[]) {
  if (typeof window === "undefined") return;
  for (const path of paths) {
    const webp = illustWebpUrl(path);
    if (!webp) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = webp;
  }
}
