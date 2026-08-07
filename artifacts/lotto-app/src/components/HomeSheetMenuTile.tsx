import { Link, useLocation } from "wouter";
import IllustImage from "@/components/IllustImage";
import type { HomeSubMenuItem } from "@/data/homeMenuData";
import { consumeOverlayForNavigation } from "@/utils/overlayBackStack";

export type HomeSheetAction = "core-highlights";

export default function HomeSheetMenuTile({
  item,
  onNavigate,
  onSheetOpen,
}: {
  item: HomeSubMenuItem;
  onNavigate?: () => void;
  onSheetOpen?: (sheet: HomeSheetAction) => void;
}) {
  const [, setLocation] = useLocation();

  const desc = item.kind === "info" ? item.desc : item.desc;

  const body = (
    <>
      <span className="mania-menu-grid__art" aria-hidden>
        <IllustImage src={item.image} className="mania-menu-grid__img" loading="lazy" />
      </span>
      <span className="mania-menu-grid__label">{item.label}</span>
      {desc ? (
        <span
          className={
            item.kind === "info"
              ? "mania-menu-grid__desc mania-menu-grid__desc--guide"
              : "mania-menu-grid__desc mania-menu-grid__desc--sr"
          }
        >
          {desc}
        </span>
      ) : null}
    </>
  );

  if (item.kind === "sheet") {
    return (
      <button
        type="button"
        onClick={() => onSheetOpen?.(item.sheet)}
        title={item.desc}
        aria-label={item.desc ? `${item.label}. ${item.desc}` : item.label}
        className="mania-menu-grid__tile mania-menu-grid__tile--sheet"
      >
        {body}
      </button>
    );
  }

  if (item.kind === "link") {
    const href = item.href;
    if (!href) {
      return (
        <div
          className="mania-menu-grid__tile mania-menu-grid__tile--sheet"
          aria-label={item.desc ? `${item.label}. ${item.desc}` : item.label}
        >
          {body}
        </div>
      );
    }

    return (
      <Link
        href={href}
        onClick={(e) => {
          if (!onNavigate) return;
          e.preventDefault();
          consumeOverlayForNavigation(href);
          onNavigate();
          setLocation(href);
        }}
        title={item.desc}
        aria-label={item.desc ? `${item.label}. ${item.desc}` : item.label}
        className="mania-menu-grid__tile mania-menu-grid__tile--sheet"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="mania-menu-grid__tile mania-menu-grid__tile--sheet mania-menu-grid__tile--info">
      {body}
    </div>
  );
}
