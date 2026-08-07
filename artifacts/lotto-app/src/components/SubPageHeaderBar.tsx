import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import IllustImage from "@/components/IllustImage";

type SubPageHeaderBarProps = {
  title: string;
  image: string;
  backHref?: string;
  onBack?: () => void;
  backAriaLabel?: string;
  trailing?: ReactNode;
};

export default function SubPageHeaderBar({
  title,
  image,
  backHref,
  onBack,
  backAriaLabel = "이전",
  trailing,
}: SubPageHeaderBarProps) {
  const backContent = (
    <>
      <ArrowLeft className="w-6 h-6 shrink-0" strokeWidth={2.5} />
      <span>이전</span>
    </>
  );

  return (
    <header className="sub-page-header sub-page-header--hero">
      {backHref ? (
        <Link href={backHref} className="sub-page-header__back" aria-label={backAriaLabel}>
          {backContent}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onBack}
          className="sub-page-header__back"
          aria-label={backAriaLabel}
        >
          {backContent}
        </button>
      )}

      <div className="sub-page-header__illust" aria-hidden>
        <IllustImage
          src={image}
          className="sub-page-header__illust-img"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      <h1 className="sub-page-header__title">{title}</h1>

      {trailing ? <div className="sub-page-header__side">{trailing}</div> : null}
    </header>
  );
}
