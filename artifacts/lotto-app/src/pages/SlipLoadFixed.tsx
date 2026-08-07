import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import SlipBallRow from "@/components/SlipBallRow";
import { useFavoritePicks } from "@/hooks/useFavoritePicks";
import { favoritePickToSlipGame } from "@/utils/favoriteNumbers";
import { appendFavoritePicksToSlip } from "@/utils/slipDraft";

export default function SlipLoadFixed() {
  const { picks, loading, refresh } = useFavoritePicks();
  const [, navigate] = useLocation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const games = useMemo(
    () => [...picks].sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    [picks],
  );
  const selectedCount = selectedIds.size;
  const allSelected = games.length > 0 && selectedCount === games.length;
  const showFooter = games.length > 0;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(games.map((pick) => pick.id)));
  }

  function confirmSelection() {
    const picked = games.filter((pick) => selectedIds.has(pick.id));
    if (picked.length === 0) return;

    const added = appendFavoritePicksToSlip(
      picked.map((pick) => {
        const game = favoritePickToSlipGame(pick);
        return {
          numbers: game.numbers,
          mode: game.mode,
          favoritePickId: pick.id,
        };
      }),
    );
    if (added === 0) return;

    navigate("/slip?edit=1&tab=fixed");
  }

  return (
    <div className={`page-content slip-load-page${showFooter ? " slip-load-page--pick" : ""}`}>
      <p className="slip-load-page__notice slip-load-page__notice--fixed">
        <span className="slip-game-category slip-game-category--fixed">고정번호</span>
        고정번호는 <strong>모바일 슬립지 → 고정번호</strong> 탭에서 QR로 관리해요.
      </p>

      {loading ? (
        <div className="slip-load-page__loading">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base text-gray-500 text-center">불러오는 중...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="slip-load-page__empty">
          <p className="slip-load-page__empty-text">불러올 고정번호가 없습니다.</p>
          <Link href="/slip?edit=1&tab=fixed" className="slip-load-page__empty-link">
            고정번호 만들기
            <ChevronRight className="w-4 h-4" aria-hidden />
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
            {games.map((pick) => {
              const game = favoritePickToSlipGame(pick);
              const selected = selectedIds.has(pick.id);
              return (
                <li key={pick.id}>
                  <button
                    type="button"
                    onClick={() => toggleSelect(pick.id)}
                    className={`slip-load-row slip-fixed-panel__row${selected ? " slip-load-row--selected" : ""}`}
                    aria-pressed={selected}
                  >
                    <span className="slip-load-row__check" aria-hidden>
                      <span
                        className={`slip-load-row__check-dot${selected ? " slip-load-row__check-dot--on" : ""}`}
                      />
                    </span>
                    <span className="slip-fixed-panel__balls">
                      <SlipBallRow game={game} />
                    </span>
                  </button>
                </li>
              );
            })}
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
              선택 완료
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
