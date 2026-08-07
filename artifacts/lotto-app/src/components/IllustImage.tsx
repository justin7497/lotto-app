import { useEffect, useMemo, useState } from "react";
import { getLocalBuildId } from "@/utils/appVersion";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const webpExistsCache = new Map<string, boolean>();

function withIllustVersion(url: string): string {
  const buildId = getLocalBuildId();
  if (buildId === "dev") return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(buildId)}`;
}

async function checkWebpExists(url: string): Promise<boolean> {
  if (webpExistsCache.has(url)) return webpExistsCache.get(url)!;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ok = res.ok && (res.headers.get("content-type") ?? "").includes("image/webp");
    webpExistsCache.set(url, ok);
    return ok;
  } catch {
    webpExistsCache.set(url, false);
    return false;
  }
}

export default function IllustImage({
  src,
  className,
  loading = "lazy",
  fetchPriority,
}: {
  src: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const fullPng = useMemo(() => withIllustVersion(`${basePath}${src}`), [src]);
  const fullWebp = useMemo(
    () =>
      /\.png$/i.test(src)
        ? withIllustVersion(`${basePath}${src.replace(/\.png$/i, ".webp")}`)
        : null,
    [src],
  );
  const [webpOk, setWebpOk] = useState<boolean | null>(() =>
    fullWebp ? (webpExistsCache.get(fullWebp) ?? null) : false,
  );

  useEffect(() => {
    if (!fullWebp) return;
    if (webpExistsCache.has(fullWebp)) {
      setWebpOk(webpExistsCache.get(fullWebp)!);
      return;
    }
    let cancelled = false;
    checkWebpExists(fullWebp).then((ok) => {
      if (!cancelled) setWebpOk(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [fullWebp]);

  const img = (
    <img
      src={fullPng}
      alt=""
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
    />
  );

  if (!fullWebp || webpOk !== true) {
    return img;
  }

  return (
    <picture className="illust-picture">
      <source srcSet={fullWebp} type="image/webp" />
      {img}
    </picture>
  );
}
