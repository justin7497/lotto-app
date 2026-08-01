import { useEffect, useState } from "react";
import { Hash, QrCode } from "lucide-react";
import { useLocation } from "wouter";
import HomeCategorySheet from "@/components/HomeCategorySheet";
import HomeMainGrid from "@/components/HomeMainGrid";
import IllustImage from "@/components/IllustImage";
import LottoBall from "@/components/LottoBall";
import QrHubSheet from "@/components/QrHubSheet";
import { useAuth } from "@/context/AuthContext";
import { useHomeTheme } from "@/context/HomeThemeContext";
import { useLottoContext } from "@/context/LottoDataContext";
import { settingsCategoryLabel, type HomeCategoryId } from "@/data/homeMenuData";
import { allThemesImagePaths } from "@/data/homeThemes";
import { preloadIllustrations } from "@/utils/preloadIllustrations";

function formatDrawDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

function HeroActions({
  onQrWin,
  onWinningNumbers,
}: {
  onQrWin: () => void;
  onWinningNumbers: () => void;
}) {
  return (
    <div className="mania-hero__actions">
      <button
        type="button"
        onClick={onQrWin}
        className="mania-hero__action mania-hero__action--featured"
        aria-label="QR 당첨확인/저장"
      >
        <QrCode className="mania-hero__action-icon" strokeWidth={2} aria-hidden />
        <span className="mania-hero__action-label">QR 당첨확인/저장</span>
      </button>
      <button
        type="button"
        onClick={onWinningNumbers}
        className="mania-hero__action"
        aria-label="당첨번호/당첨점"
      >
        <Hash className="mania-hero__action-icon" strokeWidth={2} aria-hidden />
        <span className="mania-hero__action-label">당첨번호/당첨점</span>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { latestRound, updateMsg, updateFailed } = useLottoContext();
  const { isSignedIn, isLoaded } = useAuth();
  const { heroImage, tagline, mainGrid } = useHomeTheme();
  const [, navigate] = useLocation();
  const [qrWinOpen, setQrWinOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<HomeCategoryId | null>(null);

  useEffect(() => {
    preloadIllustrations(allThemesImagePaths());
  }, []);

  const mainGridItems = mainGrid.map((item) =>
    item.id === "settings"
      ? {
          ...item,
          label: isLoaded ? settingsCategoryLabel(isSignedIn) : item.label,
        }
      : item,
  );
  const wins = latestRound
    ? [
        latestRound.drwtNo1,
        latestRound.drwtNo2,
        latestRound.drwtNo3,
        latestRound.drwtNo4,
        latestRound.drwtNo5,
        latestRound.drwtNo6,
      ]
    : null;

  function openCategory(id: HomeCategoryId) {
    setActiveCategory(id);
    setCategoryOpen(true);
  }

  function closeCategory() {
    setCategoryOpen(false);
    setActiveCategory(null);
  }

  return (
    <>
      <div className="mania-home">
        <header className="mania-hero">
          <div className="mania-hero__top">
            <div className="mania-hero__brand-row">
              <IllustImage
                src={heroImage}
                className="mania-hero__mascot"
                loading="eager"
                fetchPriority="high"
              />
              <div className="mania-hero__brand-info">
                <p className="mania-hero__brand-line">
                  <span>소원로또</span>
                  {latestRound ? (
                    <span className="mania-hero__round-inline"> · 제{latestRound.drwNo}회</span>
                  ) : null}
                </p>
                <p className="mania-hero__brand-tagline">{tagline}</p>
              </div>
            </div>
          </div>

          {latestRound ? (
            <div className="mania-hero__draw">
              <p className="mania-hero__date">{formatDrawDate(latestRound.drwNoDate)}</p>
              <div className="mania-hero__balls ball-row">
                {wins!.map((n, i) => (
                  <LottoBall
                    key={n}
                    number={n}
                    size="sm"
                    variant="gloss"
                    dramatic
                    animate
                    delay={i * 0.06}
                  />
                ))}
                <span className="mania-hero__plus">+</span>
                <LottoBall
                  number={latestRound.bnusNo}
                  size="sm"
                  variant="gloss"
                  dramatic
                  animate
                  isBonus
                  delay={0.42}
                />
              </div>
              <HeroActions
                onQrWin={() => setQrWinOpen(true)}
                onWinningNumbers={() => navigate("/winning-numbers")}
              />
            </div>
          ) : (
            <div className="mania-hero__draw">
              <p className="mania-hero__date">당첨번호 불러오는 중…</p>
              <HeroActions
                onQrWin={() => setQrWinOpen(true)}
                onWinningNumbers={() => navigate("/winning-numbers")}
              />
            </div>
          )}

          {updateMsg ? (
            <p className={`mania-hero__msg${updateFailed ? " mania-hero__msg--warn" : ""}`}>
              {updateMsg}
            </p>
          ) : null}
        </header>
        <div className="mania-home__scroll">
          <HomeMainGrid items={mainGridItems} onSelect={openCategory} />
        </div>
      </div>

      <HomeCategorySheet
        open={categoryOpen}
        categoryId={activeCategory}
        onClose={closeCategory}
      />
      <QrHubSheet open={qrWinOpen} onClose={() => setQrWinOpen(false)} />
    </>
  );
}
