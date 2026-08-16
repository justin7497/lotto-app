import type { ReactNode } from "react";
import IllustImage from "@/components/IllustImage";

type DrawIllustSceneProps = {
  src: string;
  className?: string;
  children?: ReactNode;
};

export default function DrawIllustScene({ src, className = "", children }: DrawIllustSceneProps) {
  return (
    <div className={`draw-illust-scene${className ? ` ${className}` : ""}`}>
      <div className="draw-illust-scene__frame" aria-hidden>
        <IllustImage
          src={src}
          className="draw-illust-scene__art"
          loading="eager"
          fetchPriority="high"
        />
        {children}
      </div>
    </div>
  );
}
