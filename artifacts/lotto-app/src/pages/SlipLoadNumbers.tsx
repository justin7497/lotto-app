import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import SlipLoadNumberRow from "@/components/SlipLoadNumberRow";
import { useSavedSets } from "@/hooks/useSavedSets";
import { SLIP_GAME_CATEGORY_LABELS, type SlipGameCategory } from "@/utils/slipGameMeta";
import { appendSavedNumberGamesToSlip } from "@/utils/slipDraft";
import { flattenSavedGames } from "@/utils/savedNumberGames";

function parseSlipTabFromSearch(search: string): SlipGameCategory {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("tab") === "fixed" ? "fixed" : "regular";
}

export default function SlipLoadNumbers() {
  const [location, navigate] = useLocation();
  const slipTab = useMemo(() => parseSlipTabFromSearch(location.split("?")[1] ?? ""), [location]);
  const { sets, loading, refresh } = useSavedSets();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const games = useMemo(() => flattenSavedGames(sets), [sets]);
  const selectedCount = selectedKeys.size;
  const allSelected = games.length > 0 && selectedCount === games.length;
  const showFooter = games.length > 0;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(games.map((g) => g.key)));
  }

  function confirmSelection() {
    const picked = games.filter((g) => selectedKeys.has(g.key));
    if (picked.length === 0) return;

    const added = appendSavedNumberGamesToSlip(
      picked.map((g) => ({
        numbers: g.numbers,
        savedSetId: g.savedSetId,
        slipPickMode: g.slipPickMode,
      })),
      slipTab,
    );
    if (added === 0) return;

    navigate(`/slip?tab=${slipTab}&qr=1`);
  }

  return (
    <div className={`page-content slip-load-page${showFooter ? " slip-load-page--pick" : ""}`}>
      <p className="slip-load-page__notice">
        <span className={`slip-game-category slip-game-category--${slipTab}`}>
          {SLIP_GAME_CATEGORY_LABELS[slipTab]}
        </span>
        나의 로또 번호는 <strong>홈 → 나의 로또번호</strong>에서 만들 수 있어요.
      </p>

      {loading ? (
        <div className="slip-load-page__loading">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base text-gray-500 text-center">불러오는 중...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="slip-load-page__empty">
          <p className="slip-load-page__empty-text">저장된 번호가 없습니다.</p>
          <Link href="/saved-numbers" className="slip-load-page__empty-link">
            나의 로또번호로 이동
          </Link>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="slip-load-page__bar"
            aria-pressed={allSelected}
          >
            <span className="slip-load-row__check" aria-hidden>
              <span
                className={`slip-load-row__check-dot${allSelected ? " slip-load-row__check-dot--on" : ""}`}
              />
            </span>
            <span className="slip-load-page__bar-text">
              전체 {games.length}개 /{" "}
              <span className="slip-load-page__bar-selected">선택 {selectedCount}개</span>
            </span>
          </button>

          <ul className="slip-load-page__list">
            {games.map((item) => (
              <li key={item.key}>
                <SlipLoadNumberRow
                  item={item}
                  selected={selectedKeys.has(item.key)}
                  onToggle={() => toggleSelect(item.key)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {showFooter ? (
        <div className="page-sticky-footer">
          <div className="page-sticky-footer__inner">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={confirmSelection}
              className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-40"
            >
              {selectedCount === 0
                ? "선택 완료"
                : `QR슬립지 만들기 (${selectedCount}게임)`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
