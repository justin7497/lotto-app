import { Link, useLocation } from "wouter";
import IllustImage from "@/components/IllustImage";
import PageCard from "@/components/PageCard";
import { DEFAULT_DRAW_MODE_ID, DRAW_MODE_LIST } from "@/data/drawModes";

export default function DrawModePicker() {
  const [location] = useLocation();
  const activePath = location.split("?")[0];

  return (
    <PageCard className="draw-mode-settings">
      <p className="draw-mode-settings__desc">마음에 드는 추첨 방식을 골라 주세요.</p>
      <ul className="draw-mode-settings__grid">
        {DRAW_MODE_LIST.map((mode) => {
          const active = activePath === mode.href;
          const isDefault = mode.id === DEFAULT_DRAW_MODE_ID;
          return (
            <li key={mode.id} className="draw-mode-settings__grid-item">
              <Link
                href={mode.href}
                className={`draw-mode-settings__tile${active ? " draw-mode-settings__tile--active" : ""}`}
                aria-label={`${mode.label}. ${mode.tagline} ${mode.description}`}
              >
                <span
                  className={`draw-mode-settings__tile-preview ${mode.previewClass}`}
                  aria-hidden
                >
                  <IllustImage src={mode.previewImage} className="draw-mode-settings__preview-img" />
                </span>
                <span className="draw-mode-settings__tile-body">
                  <span className="draw-mode-settings__label-row">
                    <span className="draw-mode-settings__label">{mode.label}</span>
                    {isDefault ? (
                      <span className="draw-mode-settings__default-badge">기본</span>
                    ) : null}
                  </span>
                  <span className="draw-mode-settings__tagline">{mode.tagline}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="draw-mode-settings__note">
        방식을 고른 뒤 바로 체험 · 번호 저장은 나의 로또번호에 보관
      </p>
    </PageCard>
  );
}
