import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import NumberImportSheet from "@/components/NumberImportSheet";
import NumberPickBoard, { PickCell } from "@/components/NumberPickBoard";
import PageCard from "@/components/PageCard";
import { DeleteActionButton, ConfirmActionButton } from "@/components/DeleteConfirmDialog";
import SlipBallRow from "@/components/SlipBallRow";
import SavedGamesListHeader from "@/components/SavedGamesListHeader";
import { TrustStrip } from "@/components/TrustUI";
import { useFavoritePicks } from "@/hooks/useFavoritePicks";
import { Lock, Smartphone } from "lucide-react";
import type { SlipGame } from "@/utils/mobileSlip";
import {
  clearAllFavoritePicks,
  deleteFavoritePick,
  favoritePickToSlipGame,
  saveFavoritePick,
} from "@/utils/favoriteNumbers";

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);
const SLOT_COUNT = 6;
/** 고정수는 최소 1칸은 자동/수동으로 남김 */
const MAX_FIXED = 5;
const MAX_EXCLUDED = 39;

function emptySelection(): Set<number> {
  return new Set();
}

type ModalKind = "fixed" | "exclude" | null;

function NumberPickModal({
  kind,
  draft,
  blocked,
  maxCount,
  hint,
  onToggle,
  onReset,
  onConfirm,
  onClose,
}: {
  kind: "fixed" | "exclude";
  draft: Set<number>;
  /** 상대 쪽에서 이미 쓴 번호 — 선택 불가 */
  blocked: Set<number>;
  maxCount: number;
  hint: string | null;
  onToggle: (n: number) => void;
  onReset: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const title = kind === "fixed" ? "고정수 선택" : "제외수 선택";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 pb-4 sm:pb-0"
      role="dialog"
      aria-modal
      aria-labelledby="pick-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 id="pick-modal-title" className="text-lg font-bold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-base font-bold text-gray-800 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="pick-board">
            <div className="pick-board__grid">
              {ALL_NUMBERS.map((n) => {
                const isBlocked = blocked.has(n);
                const isOn = draft.has(n);
                return (
                  <PickCell
                    key={n}
                    number={n}
                    selected={isOn}
                    disabled={isBlocked}
                    onClick={() => onToggle(n)}
                  />
                );
              })}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2 px-0.5">
            {kind === "fixed"
              ? `* 최대 ${maxCount}개 · 자동 채우기 시 항상 포함`
              : `* 최대 ${maxCount}개 · 선택·자동에서 제외`}
            {draft.size > 0 ? ` · 현재 ${draft.size}개` : ""}
          </p>
          {hint && (
            <p className="text-sm text-red-600 mt-1 px-0.5" role="alert">
              {hint}
            </p>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4">
          {draft.size > 0 ? (
            <ConfirmActionButton
              label="초기화"
              tone="neutral"
              className="flex-1 !rounded-xl !py-3.5 !text-base"
              confirmTitle={kind === "fixed" ? "고정수 초기화" : "제외수 초기화"}
              confirmMessage={
                kind === "fixed"
                  ? "선택한 고정수를 모두 지울까요?"
                  : "선택한 제외수를 모두 지울까요?"
              }
              confirmLabel="초기화"
              onConfirm={onReset}
            />
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3.5 text-base font-bold text-gray-400"
            >
              초기화
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="page-cta page-cta--dark flex-1"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyPicks() {
  const { picks, loading, refresh } = useFavoritePicks();
  const [, navigate] = useLocation();
  const openedFromMenuRef = useRef(false);
  const [selected, setSelected] = useState<Set<number>>(emptySelection);
  const [fixedNums, setFixedNums] = useState<Set<number>>(emptySelection);
  const [excludedNums, setExcludedNums] = useState<Set<number>>(emptySelection);
  const [modal, setModal] = useState<ModalKind>(null);
  const [draft, setDraft] = useState<Set<number>>(emptySelection);
  const [modalHint, setModalHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [autoSemi, setAutoSemi] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("import") !== "qr") return;
    openedFromMenuRef.current = true;
    setImportOpen(true);
    params.delete("import");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  const selectedList = useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected],
  );

  const previewGame = useMemo((): SlipGame | null => {
    if (selectedList.length === 0 && !autoSemi) return null;
    if (autoSemi && selectedList.length === 0) {
      return { numbers: [], mode: "A" };
    }
    return { numbers: selectedList, mode: "M" };
  }, [autoSemi, selectedList]);

  const orderedPicks = useMemo(
    () => [...picks].sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    [picks],
  );

  const refreshPicks = useCallback(() => {
    void refresh();
  }, [refresh]);

  function openFixedModal() {
    setError(null);
    setModalHint(null);
    setDraft(new Set(fixedNums));
    setModal("fixed");
  }

  function openExcludeModal() {
    setError(null);
    setModalHint(null);
    setDraft(new Set(excludedNums));
    setModal("exclude");
  }

  function toggleDraft(n: number) {
    if (modal === "fixed" && excludedNums.has(n)) return;
    if (modal === "exclude" && fixedNums.has(n)) return;

    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
        setModalHint(null);
        return next;
      }
      const max = modal === "fixed" ? MAX_FIXED : MAX_EXCLUDED;
      if (next.size >= max) {
        setModalHint(
          modal === "fixed"
            ? `고정수는 최대 ${MAX_FIXED}개까지`
            : `제외수는 최대 ${MAX_EXCLUDED}개까지`,
        );
        return prev;
      }
      setModalHint(null);
      next.add(n);
      return next;
    });
  }

  function confirmModal() {
    if (modal === "fixed") {
      const nextFixed = new Set(draft);
      setFixedNums(nextFixed);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const n of excludedNums) next.delete(n);
        for (const n of nextFixed) next.add(n);
        if (next.size > SLOT_COUNT) {
          const keep = [...nextFixed];
          const extras = [...next].filter((n) => !nextFixed.has(n));
          return new Set([...keep, ...extras].slice(0, SLOT_COUNT));
        }
        return next;
      });
    } else if (modal === "exclude") {
      const nextExcluded = new Set(draft);
      setExcludedNums(nextExcluded);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const n of nextExcluded) next.delete(n);
        return next;
      });
      setFixedNums((prev) => {
        const next = new Set(prev);
        for (const n of nextExcluded) next.delete(n);
        return next;
      });
    }
    setModal(null);
    setDraft(emptySelection());
    setModalHint(null);
    setError(null);
  }

  function toggleNumber(n: number) {
    setError(null);
    if (excludedNums.has(n)) {
      setError("제외된 번호입니다. 제외수에서 해제해 주세요.");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
        setFixedNums((f) => {
          if (!f.has(n)) return f;
          const nf = new Set(f);
          nf.delete(n);
          return nf;
        });
        return next;
      }
      if (next.size >= SLOT_COUNT) {
        setError("최대 6개까지 선택 가능합니다.");
        return prev;
      }
      next.add(n);
      return next;
    });
  }

  function handleAutoFill() {
    setError(null);
    const base = new Set(fixedNums);
    for (const n of selected) {
      if (!excludedNums.has(n)) base.add(n);
    }
    if (base.size >= SLOT_COUNT) {
      setSelected(new Set([...base].slice(0, SLOT_COUNT)));
      return;
    }
    const need = SLOT_COUNT - base.size;
    const pool = ALL_NUMBERS.filter((n) => !base.has(n) && !excludedNums.has(n));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (pool.length < need) {
      setError("제외수가 너무 많아 6개를 채울 수 없습니다.");
      return;
    }
    setSelected(new Set([...base, ...pool.slice(0, need)]));
  }

  function handleReset() {
    setSelected(new Set(fixedNums));
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const nums = selectedList;
    if (nums.length === 0) {
      if (!autoSemi) {
        setError("번호를 선택하거나 자동/반자동을 켜 주세요.");
        return;
      }
    } else if (nums.length < SLOT_COUNT && !autoSemi) {
      setError("번호 6개를 선택하거나 자동/반자동을 켜 주세요.");
      return;
    }
    const mode = nums.length === 0 ? "A" : "M";
    const saved = await saveFavoritePick("", nums, mode);
    if (!saved) {
      setError("저장에 실패했습니다.");
      return;
    }
    setSelected(new Set(fixedNums));
    refreshPicks();
    setShowSavedModal(true);
  }

  async function handleDelete(id: string) {
    await deleteFavoritePick(id);
    refreshPicks();
  }

  async function handleDeleteAll() {
    await clearAllFavoritePicks();
    refreshPicks();
  }

  return (
    <div className="page-content pb-36">

      {previewGame ? (
        <PageCard className="!py-2">
          <div className="min-w-0">
            <SlipBallRow game={previewGame} />
          </div>
          {autoSemi ? (
            <p className="text-sm text-center text-gray-500 mt-2">
              물음표(?)는 판매점 단말기에서 자동으로 채워집니다
            </p>
          ) : null}
        </PageCard>
      ) : null}

      {/* 고정수 / 제외수 */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          type="button"
          onClick={openFixedModal}
          className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
            fixedNums.size > 0
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-gray-300 bg-white text-gray-700"
          }`}
        >
          고정수{fixedNums.size > 0 ? ` ${fixedNums.size}` : ""}
        </button>
        <button
          type="button"
          onClick={openExcludeModal}
          className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
            excludedNums.size > 0
              ? "border-gray-500 bg-gray-100 text-gray-800"
              : "border-gray-300 bg-white text-gray-700"
          }`}
        >
          제외수{excludedNums.size > 0 ? ` ${excludedNums.size}` : ""}
        </button>
      </div>

      <PageCard className="!p-3">
        <NumberPickBoard
          selected={selected}
          excluded={excludedNums}
          onToggle={toggleNumber}
          autoSemi={autoSemi}
          onAutoSemiChange={setAutoSemi}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleAutoFill}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                자동 채우기
              </button>
              <ConfirmActionButton
                label="선택 지우기"
                tone="neutral"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                confirmTitle="선택 지우기"
                confirmMessage="지금 선택한 번호를 지우고 고정수만 남길까요?"
                confirmLabel="지우기"
                onConfirm={handleReset}
              />
            </div>
          }
        />
      </PageCard>

      <p className="text-sm text-gray-500 mb-4 px-0.5">
        {autoSemi
          ? "* 자동/반자동을 켜면 1~5개만 골라도 저장할 수 있습니다."
          : "* 최대 6개까지 선택 가능합니다."}
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-3 text-center" role="alert">
          {error}
        </p>
      )}

      {/* 저장 목록 */}
      {loading ? (
        <p className="text-sm text-gray-500 mb-6 text-center">저장 번호 불러오는 중…</p>
      ) : orderedPicks.length > 0 ? (
        <PageCard>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-bold text-gray-900">저장 번호</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-500">총 {orderedPicks.length}게임</span>
              <ConfirmActionButton
                label="전체 삭제"
                tone="danger"
                className="!px-2.5 !py-1.5 !text-sm"
                confirmTitle="저장 번호 전체 삭제"
                confirmMessage="저장한 번호를 모두 삭제할까요? 되돌릴 수 없습니다."
                confirmLabel="전체 삭제"
                onConfirm={() => void handleDeleteAll()}
              />
            </div>
          </div>
          <SavedGamesListHeader />
          <ul className="slip-games-list space-y-2">
            {orderedPicks.map((pick) => (
              <li
                key={pick.id}
                className="slip-games-list__row flex items-start gap-1 rounded-xl bg-gray-50 border border-gray-100 px-1.5 py-2"
              >
                <div className="flex-1 min-w-0">
                  <SlipBallRow game={favoritePickToSlipGame(pick)} />
                </div>
                <DeleteActionButton
                  size="mini"
                  className="shrink-0"
                  confirmTitle="번호 삭제"
                  confirmMessage="선택한 번호를 삭제할까요?"
                  onConfirm={() => handleDelete(pick.id)}
                />
              </li>
            ))}
          </ul>
        </PageCard>
      ) : null}

      {/* 하단 저장 — 하단 탭 네비 위 */}
      <div className="fixed inset-x-0 z-40 px-3 pt-3 pb-2 bg-gradient-to-t from-white via-white to-transparent pointer-events-none bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
        <div className="w-full max-w-none mx-auto pointer-events-auto space-y-2">
          <TrustStrip
            className="trust-strip--compact"
            badges={[
              { icon: Smartphone, label: "이 기기 저장" },
              { icon: Lock, label: "로그인 시 백업" },
            ]}
          />
          <button
            type="button"
            onClick={handleSave}
            className="page-cta page-cta--dark w-full"
          >
            저장
          </button>
        </div>
      </div>

      {/* 저장 완료 모달 */}
      {showSavedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          role="dialog"
          aria-modal
          aria-labelledby="saved-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p
              id="saved-modal-title"
              className="text-center text-base font-semibold text-gray-900 leading-relaxed mb-5"
            >
              나의 로또 번호로 저장되었습니다.
            </p>
            <button
              type="button"
              onClick={() => setShowSavedModal(false)}
              className="page-cta page-cta--dark w-full"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {modal && (
        <NumberPickModal
          kind={modal}
          draft={draft}
          blocked={modal === "fixed" ? excludedNums : fixedNums}
          maxCount={modal === "fixed" ? MAX_FIXED : MAX_EXCLUDED}
          hint={modalHint}
          onToggle={toggleDraft}
          onReset={() => {
            setDraft(emptySelection());
            setModalHint(null);
          }}
          onConfirm={confirmModal}
          onClose={() => {
            setModal(null);
            setDraft(emptySelection());
            setModalHint(null);
          }}
        />
      )}

      <p className="text-sm text-gray-400 mt-2 text-center mb-24">
        슬립지에서 「내번호」로 불러올 수 있습니다
      </p>

      <NumberImportSheet
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          if (openedFromMenuRef.current) {
            openedFromMenuRef.current = false;
            navigate("/");
          }
        }}
        onSaved={() => refreshPicks()}
      />
    </div>
  );
}
