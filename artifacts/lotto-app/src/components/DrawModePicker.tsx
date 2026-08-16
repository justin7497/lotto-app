import { Link, useLocation } from "wouter";
import IllustImage from "@/components/IllustImage";
import { DEFAULT_DRAW_MODE_ID, DRAW_MODE_LIST } from "@/data/drawModes";

export default function DrawModePicker() {
  const [location] = useLocation();
  const activePath = location.split("?")[0];

  return (
    <>
      <p className="draw-mode-page__lead">마음에 드는 추첨 방식을 골라 주세요.</p>

      <section className="mania-menu-grid-section mania-menu-grid-section--main draw-mode-grid-section flex-1 min-h-0 w-full">
        <div className="mania-home-grid-wrap draw-mode-grid-wrap">
        <ul className="mania-menu-grid draw-mode-grid">
          {DRAW_MODE_LIST.map((mode) => {
            const active = activePath === mode.href;
            const isDefault = mode.id === DEFAULT_DRAW_MODE_ID;
            return (
              <li key={mode.id}>
                <Link
                  href={mode.href}
                  className={`mania-menu-grid__tile draw-mode-grid__tile${active ? " draw-mode-grid__tile--active" : ""}`}
                  aria-label={`${mode.label}. ${mode.tagline} ${mode.description}`}
                >
                  <span
                    className={`mania-menu-grid__art draw-mode-grid__art ${mode.previewClass}`}
                    aria-hidden
                  >
                    <IllustImage
                      src={mode.previewImage}
                      className="mania-menu-grid__img"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </span>
                  <span className="mania-menu-grid__label">
                    {mode.label}
                    {isDefault ? (
                      <span className="draw-mode-grid__badge">기본</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        </div>
      </section>

      <p className="draw-mode-page__note">
        방식을 고른 뒤 바로 뽑기 · 번호 저장은 나의 로또번호에 보관
      </p>
    </>
  );
}
