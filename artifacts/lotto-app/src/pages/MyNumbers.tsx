import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { useLocation } from "wouter";
import MyNumberGameRow from "@/components/MyNumberGameRow";
import NumberImportSheet from "@/components/NumberImportSheet";
import RecommendMethodsSheet from "@/components/RecommendMethodsSheet";
import {
  canDeleteSavedNumbers,
  removeGamesFromSavedSets,
} from "@/utils/savedNumbers";
import {
  flattenSavedGames,
  getMyNumberSlipCompletedKeys,
  groupSavedGamesByEvent,
  type SavedNumberEventGroup,
} from "@/utils/savedNumberGames";
import { useAuth } from "@/context/AuthContext";
import { AUTH_UI_VISIBLE } from "@/config/authUi";
import { useSavedSets } from "@/hooks/useSavedSets";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { appendSavedNumberGamesToSlip } from "@/utils/slipDraft";

type PickMode = "delete" | "slip" | null;

export default function MyNumbers() {
  const { sets, loading, refresh } = useSavedSets();
  const { isSignedIn } = useAuth();
  const [location, navigate] = useLocation();
  const canDelete = canDeleteSavedNumbers();

  const [importOpen, setImportOpen] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const games = useMemo(() => flattenSavedGames(sets), [sets]);
  const eventGroups = useMemo(() => groupSavedGamesByEvent(sets), [sets]);
  const completedSlipKeys = useMemo(
    () => getMyNumberSlipCompletedKeys(sets),
    [sets, location],
  );
  const selectedCount = selectedKeys.size;
  const allSelected = games.length > 0 && selectedCount === games.length;
  const inPickMode = pickMode !== null;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("import") === "qr") {
      setImportOpen(true);
      params.delete("import");
    }
    if (params.get("pick") === "slip") {
      setPickMode("slip");
      setSelectedKeys(new Set());
      params.delete("pick");
    }
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  useEffect(() => {
    if (!actionError) return;
    const t = window.setTimeout(() => setActionError(null), 2800);
    return () => window.clearTimeout(t);
  }, [actionError]);

  function clearPickMode() {
    setPickMode(null);
    setSelectedKeys(new Set());
  }

  function toggleSelect(key: string) {
    setActionError(null);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      next.add(key);
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

  function eventHasSelection(group: SavedNumberEventGroup, keys: Set<string> = selectedKeys) {
    return group.games.some((g) => keys.has(g.key));
  }

  function toggleSelectEvent(group: SavedNumberEventGroup) {
    setActionError(null);
    const groupKeys = group.games.map((g) => g.key);

    setSelectedKeys((prev) => {
      if (group.games.some((g) => prev.has(g.key))) {
        const next = new Set(prev);
        groupKeys.forEach((key) => next.delete(key));
        return next;
      }

      const next = new Set(prev);
      for (const key of groupKeys) {
        if (next.has(key)) continue;
        next.add(key);
      }
      return next;
    });
  }

  function startDeletePick() {
    setPickMode("delete");
    setSelectedKeys(new Set());
    setActionError(null);
  }

  function startSlipPick() {
    setPickMode("slip");
    setSelectedKeys(new Set());
    setActionError(null);
  }

  function confirmSlipQr() {
    const picked = games.filter((g) => selectedKeys.has(g.key));
    if (picked.length === 0) return;

    const added = appendSavedNumberGamesToSlip(
      picked.map((g) => ({
        numbers: g.numbers,
        savedSetId: g.savedSetId,
        slipPickMode: g.slipPickMode,
      })),
      "regular",
    );
    if (added === 0) {
      setActionError("QR슬립지를 만들 번호를 선택해 주세요.");
      return;
    }

    clearPickMode();
    navigate("/slip?tab=regular&qr=1&sheet=last");
  }

  async function confirmBulkDelete() {
    const picked = games.filter((g) => selectedKeys.has(g.key));
    if (picked.length === 0) return;

    const result = await removeGamesFromSavedSets(
      picked.map((g) => ({ savedSetId: g.savedSetId, gameIndex: g.gameIndex })),
    );
    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    clearPickMode();
    setBulkDeleteOpen(false);
    await refresh();
  }

  return (
    <div className={`page-content my-numbers-page${inPickMode ? " my-numbers-page--pick" : ""}`}>
      {isSignedIn && AUTH_UI_VISIBLE ? (
        <p className="page-inline-notice">
          로그인 계정의 저장번호는 삭제되지 않으며, 지난 회차 번호를 자동 복구합니다.
        </p>
      ) : null}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-base text-gray-500">불러오는 중...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="my-numbers-empty">
          <ClipboardList className="my-numbers-empty__icon" aria-hidden />
          <p className="my-numbers-empty__title">저장된 번호가 없습니다</p>
          <p className="my-numbers-empty__desc">
            추천·사주·소원 등으로 만든 번호를 여기에 모아 둘 수 있어요.
            저장한 번호는 모바일 QR슬립지에도 불러올 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setRecommendOpen(true)}
            className="my-numbers-empty__create"
          >
            번호 만들기
          </button>
        </div>
      ) : (
        <>
          <div className="my-numbers-page__top">
            <button
              type="button"
              onClick={() => setRecommendOpen(true)}
              className="my-numbers-page__create-btn"
              disabled={inPickMode}
            >
              번호 만들기
            </button>
          </div>

          <div className="my-numbers-page__bar">
            {inPickMode ? (
              <>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="my-numbers-page__select-all"
                  aria-pressed={allSelected}
                >
                  <span className="my-number-row__check" aria-hidden>
                    <span
                      className={`my-number-row__check-dot${allSelected ? " my-number-row__check-dot--on" : ""}`}
                    />
                  </span>
                  <span className="my-numbers-page__select-all-text">
                    전체 {games.length}개 /{" "}
                    <span className="my-numbers-page__select-all-count">선택 {selectedCount}개</span>
                  </span>
                </button>
                <button type="button" onClick={clearPickMode} className="my-numbers-page__cancel">
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  선택 취소
                </button>
              </>
            ) : (
              <>
                <p className="my-numbers-page__count">전체 {games.length}개</p>
                <div
                  className={`my-numbers-page__action-row${canDelete ? "" : " my-numbers-page__action-row--single"}`}
                >
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={startDeletePick}
                      className="my-numbers-page__action-btn my-numbers-page__action-btn--danger"
                    >
                      삭제
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={startSlipPick}
                    className="my-numbers-page__action-btn my-numbers-page__action-btn--slip"
                  >
                    모바일 QR슬립지 만들기
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="my-numbers-events">
            {eventGroups.map((group) => {
              const slipDoneCount = group.games.filter((g) => completedSlipKeys.has(g.key)).length;
              const eventSelected = eventHasSelection(group);

              return (
                <section key={group.savedSetId} className="my-numbers-event">
                  <header className="my-numbers-event__head">
                    <div className="my-numbers-event__title-row">
                      <h2 className="my-numbers-event__title">{group.sourceLabel}</h2>
                      <span className="my-numbers-event__round">{group.roundTag}</span>
                    </div>
                    <div className="my-numbers-event__meta-row">
                      <p className="my-numbers-event__meta">
                        {group.games.length}게임 · 생성 {group.savedAtLabel}
                        {slipDoneCount > 0 ? (
                          <span className="my-numbers-event__slip-badge">
                            {" "}
                            · QR {slipDoneCount}/{group.games.length}완료
                          </span>
                        ) : null}
                      </p>
                      {inPickMode ? (
                        <button
                          type="button"
                          onClick={() => toggleSelectEvent(group)}
                          className="my-numbers-event__select"
                          aria-pressed={eventSelected}
                        >
                          {eventSelected
                            ? "묶음 해제"
                            : pickMode === "slip" && group.games.length > 1
                              ? `묶음 선택 (${group.games.length}게임)`
                              : "묶음 선택"}
                        </button>
                      ) : null}
                    </div>
                  </header>

                  <ul className="my-numbers-event__list">
                    {group.games.map((item) => (
                      <li key={item.key}>
                        <MyNumberGameRow
                          item={item}
                          compact
                          selectable={inPickMode}
                          selected={selectedKeys.has(item.key)}
                          slipCompleted={completedSlipKeys.has(item.key)}
                          onToggleSelect={() => toggleSelect(item.key)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      {pickMode === "delete" ? (
        <div className="page-sticky-footer">
          <div className="page-sticky-footer__inner">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setBulkDeleteOpen(true)}
              className="page-cta page-cta--danger page-cta--large w-full disabled:opacity-40"
            >
              선택 {selectedCount}개 삭제
            </button>
          </div>
        </div>
      ) : pickMode === "slip" ? (
        <div className="page-sticky-footer">
          <div className="page-sticky-footer__inner">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={confirmSlipQr}
              className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-40"
            >
              QR슬립지 만들기 ({selectedCount}게임)
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <p className="text-sm text-center text-red-600 mt-3" role="alert">
          {actionError}
        </p>
      ) : null}

      <NumberImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={() => void refresh()}
      />

      <RecommendMethodsSheet
        open={recommendOpen}
        onClose={() => setRecommendOpen(false)}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title="번호 삭제"
        message={`선택한 ${selectedCount}개 번호를 삭제할까요?`}
        confirmLabel="삭제"
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}
