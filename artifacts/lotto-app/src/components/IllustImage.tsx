import { useMemo } from "react";
import { illustPublicUrl, illustWebpUrl } from "@/utils/illustUrl";

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
  const fullPng = useMemo(() => illustPublicUrl(src), [src]);
  const fullWebp = useMemo(() => illustWebpUrl(src), [src]);

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

  if (!fullWebp) {
    return img;
  }

  return (
    <picture className="illust-picture">
      <source srcSet={fullWebp} type="image/webp" />
      {img}
    </picture>
  );
}
