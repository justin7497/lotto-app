import { CircleHelp } from "lucide-react";
import type { HomeMainGridItem } from "@/data/homeMenuData";
import IllustImage from "@/components/IllustImage";

export default function HomeMainGrid({
  items,
  onSelect,
  onGuideOpen,
}: {
  items: HomeMainGridItem[];
  onSelect: (id: HomeMainGridItem["id"]) => void;
  onGuideOpen: () => void;
}) {
  return (
    <section className="mania-menu-grid-section mania-menu-grid-section--main flex-1 min-h-0 w-full">
      <div className="mania-home-grid-wrap">
        <ul className="mania-menu-grid">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="mania-menu-grid__tile"
              >
                <span className="mania-menu-grid__art" aria-hidden>
                  <IllustImage
                    src={item.image}
                    className="mania-menu-grid__img"
                    loading="eager"
                    fetchPriority="high"
                  />
                </span>
                <span className="mania-menu-grid__label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mania-home__guide-btn"
          aria-label="사용 방법 안내"
          onClick={onGuideOpen}
        >
          <CircleHelp className="mania-home__guide-icon" aria-hidden />
          <span className="mania-home__guide-label">사용법</span>
        </button>
      </div>
    </section>
  );
}
