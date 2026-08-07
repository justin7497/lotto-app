import IllustImage from "@/components/IllustImage";
import PageCard from "@/components/PageCard";
import { useHomeTheme } from "@/context/HomeThemeContext";
import { DEFAULT_HOME_THEME_ID, HOME_THEME_LIST, type HomeThemeId } from "@/data/homeThemes";

export default function HomeThemeSettings() {
  const { themeId, setThemeId } = useHomeTheme();

  return (
    <PageCard className="home-theme-settings">
      <p className="home-theme-settings__desc">홈·메뉴 그림 스타일을 골라 주세요.</p>
      <ul className="home-theme-settings__grid">
        {HOME_THEME_LIST.map((theme) => {
          const active = themeId === theme.id;
          const isDefault = theme.id === DEFAULT_HOME_THEME_ID;
          return (
            <li key={theme.id} className="home-theme-settings__grid-item">
              <button
                type="button"
                className={`home-theme-settings__tile${active ? " home-theme-settings__tile--active" : ""}`}
                aria-pressed={active}
                aria-label={`${theme.label}. ${theme.tagline} ${theme.description}`}
                onClick={() => setThemeId(theme.id as HomeThemeId)}
              >
                <span className="home-theme-settings__tile-preview" aria-hidden>
                  <IllustImage src={theme.previewGrid} className="home-theme-settings__preview-img" />
                </span>
                <span className="home-theme-settings__tile-body">
                  <span className="home-theme-settings__label-row">
                    <span className="home-theme-settings__label">{theme.label}</span>
                    {isDefault ? (
                      <span className="home-theme-settings__default-badge">기본</span>
                    ) : null}
                  </span>
                  <span className="home-theme-settings__tagline">{theme.tagline}</span>
                </span>
                {active ? <span className="home-theme-settings__check">적용 중</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="home-theme-settings__note">
        선택 즉시 저장 · 홈·메뉴 그림 변경 · 번호·데이터는 그대로
      </p>
    </PageCard>
  );
}
