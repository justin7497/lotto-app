import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import NumberPickBoard from "@/components/NumberPickBoard";
import NumberPickModal, {
  MAX_EXCLUDED_NUMBERS,
  MAX_FIXED_NUMBERS,
  type NumberPickModalKind,
} from "@/components/NumberPickModal";
import SlipBallRow from "@/components/SlipBallRow";
import SlipEmptyState from "@/components/SlipEmptyState";
import SlipGamesAccordion from "@/components/SlipGamesAccordion";
import SlipInlineQr from "@/components/SlipInlineQr";
import SlipPromoteToFixedDialog from "@/components/SlipPromoteToFixedDialog";
import { ConfirmActionButton, DeleteIconButton } from "@/components/DeleteConfirmDialog";
import { GAMES_PER_SLIP } from "@/utils/mobileSlip";
import {
  SLIP_GAME_CATEGORY_LABELS,
  SLIP_SOURCE_LABELS,
  type SlipGameCategory,
} from "@/utils/slipGameMeta";
import {
  publishSlipHeaderState,
  resetSlipHeaderState,
  subscribeSlipHeaderAction,
} from "@/utils/slipPageBridge";
import {
  countIssuedGamesForCategory,
  countIssuedSheetsForCategory,
  emptySlipSheetStore,
  filterSlipGamesByCategory,
  flattenIssuedSheets,
  getIssuedSheetsForCategory,
  loadSlipDraft,
  promoteSlipGameToFixed,
  promoteSlipGamesToFixed,
  saveSlipDraft,
  type SlipGame,
  type SlipSheetStore,
} from "@/utils/slipDraft";
import { onPrintDoneInvalidate, notifyPrintDoneInvalidate } from "@/utils/printDone";
import { syncIssuedTicketSheet } from "@/utils/deviceIssuedTickets";
import { syncPrintDoneFromSlipSheet } from "@/utils/printDoneSync";

const SLOT_LABELS = ["A", "B", "C", "D", "E"] as const;
const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);
const SLOT_COUNT = 6;

type SlipNumberTab = SlipGameCategory;
type SlipView = "qr" | "list" | "editor";
type PickModalKind = NumberPickModalKind | null;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptySelection(): Set<number> {
  return new Set();
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function parseSlipTabFromSearch(search: string): SlipNumberTab {
  const params = new URLSearchParams(search);
  return params.get("tab") === "fixed" ? "fixed" : "regular";
}

function resolveInitialView(
  tab: SlipNumberTab,
  regularIssuedSheets: number,
  fixedIssuedSheets: number,
): SlipView {
  const params = new URLSearchParams(window.location.search);
  if (params.get("edit") === "1") return "editor";
  if (params.get("qr") === "1") {
    const count = tab === "fixed" ? fixedIssuedSheets : regularIssuedSheets;
    return count > 0 ? "qr" : "list";
  }
  const tabIssued = tab === "fixed" ? fixedIssuedSheets : regularIssuedSheets;
  if (tabIssued > 0) return "qr";
  return "list";
}

function stripSlipQueryParams(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("qr") && !params.has("edit") && !params.has("tab") && !params.has("sheet")) return;
  params.delete("qr");
  params.delete("edit");
  params.delete("tab");
  params.delete("sheet");
  const qs = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

function SlipPageTabs({
  activeTab,
  regularCount,
  fixedCount,
  onChange,
}: {
  activeTab: SlipNumberTab;
  regularCount: number;
  fixedCount: number;
  onChange: (tab: SlipNumberTab) => void;
}) {
  return (
    <div
      className="win-page-tabs slip-page__tabs"
      role="tablist"
      aria-label="슬립지 분류"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "regular"}
        className={`win-page-tabs__btn${activeTab === "regular" ? " win-page-tabs__btn--active" : ""}`}
        onClick={() => onChange("regular")}
      >
        {SLIP_GAME_CATEGORY_LABELS.regular}
        {regularCount > 0 ? ` (${regularCount})` : ""}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "fixed"}
        className={`win-page-tabs__btn${activeTab === "fixed" ? " win-page-tabs__btn--active" : ""}`}
        onClick={() => onChange("fixed")}
      >
        {SLIP_GAME_CATEGORY_LABELS.fixed}
        {fixedCount > 0 ? ` (${fixedCount})` : ""}
      </button>
    </div>
  );
}

export default function Slip() {
  const [location, navigate] = useLocation();
  const initial = useMemo(() => loadSlipDraft(), []);
  const initialIssued = useMemo(
    () => initial.issuedSheets ?? emptySlipSheetStore(),
    [initial.issuedSheets],
  );
  const initialTab = useMemo(
    () => parseSlipTabFromSearch(window.location.search),
    [],
  );
  const initialRegularIssued = useMemo(
    () => countIssuedSheetsForCategory(initialIssued, "regular"),
    [initialIssued],
  );
  const initialFixedIssued = useMemo(
    () => countIssuedSheetsForCategory(initialIssued, "fixed"),
    [initialIssued],
  );

  const [selected, setSelected] = useState<Set<number>>(emptySelection);
  const [autoSemi, setAutoSemi] = useState(false);
  const [issuedSheets, setIssuedSheets] = useState<SlipSheetStore>(() => initialIssued);
  const [workingRegular, setWorkingRegular] = useState<SlipGame[]>([]);
  const [workingFixed, setWorkingFixed] = useState<SlipGame[]>([]);
  const [numberTab, setNumberTab] = useState<SlipNumberTab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [printDoneSheetIds, setPrintDoneSheetIds] = useState<Set<string>>(
    () => new Set(initial.printDoneSheetIds ?? []),
  );
  const [createdAt, setCreatedAt] = useState<string | null>(() => initial.createdAt ?? null);
  const [view, setView] = useState<SlipView>(() =>
    resolveInitialView(initialTab, initialRegularIssued, initialFixedIssued),
  );
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [fixedNums, setFixedNums] = useState<Set<number>>(emptySelection);
  const [excludedNums, setExcludedNums] = useState<Set<number>>(emptySelection);
  const [pickModal, setPickModal] = useState<PickModalKind>(null);
  const [modalDraft, setModalDraft] = useState<Set<number>>(emptySelection);
  const [modalHint, setModalHint] = useState<string | null>(null);
  const [reissueSheetIndex, setReissueSheetIndex] = useState<number | null>(null);
  const picksSectionRef = useRef<HTMLElement>(null);

  const selectedList = useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected],
  );

  const tabIssuedSheets = useMemo(
    () => getIssuedSheetsForCategory(issuedSheets, numberTab),
    [issuedSheets, numberTab],
  );
  const tabWorkingGames = numberTab === "fixed" ? workingFixed : workingRegular;
  const regularGameCount =
    countIssuedGamesForCategory(issuedSheets, "regular") + workingRegular.length;
  const fixedGameCount =
    countIssuedGamesForCategory(issuedSheets, "fixed") + workingFixed.length;
  const games = useMemo(
    () => [
      ...flattenIssuedSheets(issuedSheets),
      ...workingRegular,
      ...workingFixed,
    ],
    [issuedSheets, workingRegular, workingFixed],
  );

  function setTabWorkingGames(updater: (prev: SlipGame[]) => SlipGame[]) {
    if (numberTab === "fixed") setWorkingFixed(updater);
    else setWorkingRegular(updater);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") === "fixed" ? "fixed" : "regular";
    const draft = loadSlipDraft();
    const nextIssued = draft.issuedSheets ?? emptySlipSheetStore();

    setIssuedSheets(nextIssued);
    setPrintDoneSheetIds(new Set(draft.printDoneSheetIds ?? []));
    if (draft.createdAt) setCreatedAt(draft.createdAt);

    if (params.get("edit") === "1") {
      setNumberTab(tab);
      resetEditorSelection();
      setView("editor");
    } else if (params.get("qr") === "1") {
      setNumberTab(tab);
      resetEditorSelection();
      setWorkingRegular([]);
      setWorkingFixed([]);
      setView("qr");
      if (params.get("sheet") === "last") {
        const sheets = getIssuedSheetsForCategory(nextIssued, tab);
        setActiveSheetIndex(Math.max(0, sheets.length - 1));
      }
    } else if (countIssuedSheetsForCategory(nextIssued, tab) > 0) {
      setView("qr");
    }

    stripSlipQueryParams();
  }, [location]);

  useEffect(() => {
    saveSlipDraft({
      games: flattenIssuedSheets(issuedSheets),
      issuedSheets,
      selected: [],
      autoSemi: false,
      printDoneSheetIds: [...printDoneSheetIds],
      createdAt: createdAt ?? undefined,
    });
  }, [issuedSheets, printDoneSheetIds, createdAt]);

  const showEditor = view === "editor";
  const showQrView = tabIssuedSheets.length > 0 && !showEditor;
  const showEditorFooter = showEditor;
  const isEditing = Boolean(editingGameId);
  const hasSlipContent = tabIssuedSheets.length > 0 || tabWorkingGames.length > 0;

  useEffect(() => {
    if (showEditor || showQrView) return;
    if (tabWorkingGames.length > 0) {
      setView("editor");
    }
  }, [showEditor, showQrView, tabWorkingGames.length, numberTab]);

  useEffect(() => {
    publishSlipHeaderState({
      view: showQrView ? "qr" : !hasSlipContent && !showEditor ? "empty" : "manage",
      hasGames: tabIssuedSheets.length > 0 || tabWorkingGames.length > 0,
      canAddGame: true,
    });
    return () => resetSlipHeaderState();
  }, [showQrView, showEditor, hasSlipContent, tabIssuedSheets.length, tabWorkingGames.length]);

  useEffect(() => {
    return subscribeSlipHeaderAction((action) => {
      if (action === "open-editor") openNewGameEditor();
      if (action === "open-qr") openQrView();
    });
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 2500);
    return () => window.clearTimeout(t);
  }, [message]);

  useEffect(() => {
    return onPrintDoneInvalidate(() => {
      const draft = loadSlipDraft();
      const loaded = draft.printDoneSheetIds ?? [];
      setPrintDoneSheetIds((prev) => new Set([...prev, ...loaded]));
    });
  }, []);

  useEffect(() => {
    if (activeSheetIndex >= tabIssuedSheets.length && activeSheetIndex > 0) {
      setActiveSheetIndex(Math.max(0, tabIssuedSheets.length - 1));
    }
  }, [activeSheetIndex, tabIssuedSheets.length]);

  const toggleNumber = useCallback((n: number) => {
    setError(null);
    if (excludedNums.has(n)) {
      setError("제외된 번호입니다. 제외수에서 해제해 주세요.");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
        setFixedNums((fixed) => {
          if (!fixed.has(n)) return fixed;
          const nextFixed = new Set(fixed);
          nextFixed.delete(n);
          return nextFixed;
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
  }, [excludedNums]);

  function openFixedModal() {
    setError(null);
    setModalHint(null);
    setModalDraft(new Set(fixedNums));
    setPickModal("fixed");
  }

  function openExcludeModal() {
    setError(null);
    setModalHint(null);
    setModalDraft(new Set(excludedNums));
    setPickModal("exclude");
  }

  function toggleModalDraft(n: number) {
    if (pickModal === "fixed" && excludedNums.has(n)) return;
    if (pickModal === "exclude" && fixedNums.has(n)) return;

    setModalDraft((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
        setModalHint(null);
        return next;
      }
      const max = pickModal === "fixed" ? MAX_FIXED_NUMBERS : MAX_EXCLUDED_NUMBERS;
      if (next.size >= max) {
        setModalHint(
          pickModal === "fixed"
            ? `고정수는 최대 ${MAX_FIXED_NUMBERS}개까지`
            : `제외수는 최대 ${MAX_EXCLUDED_NUMBERS}개까지`,
        );
        return prev;
      }
      setModalHint(null);
      next.add(n);
      return next;
    });
  }

  function confirmPickModal() {
    if (pickModal === "fixed") {
      const nextFixed = new Set(modalDraft);
      setFixedNums(nextFixed);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const num of excludedNums) next.delete(num);
        for (const num of nextFixed) next.add(num);
        if (next.size > SLOT_COUNT) {
          const keep = [...nextFixed];
          const extras = [...next].filter((num) => !nextFixed.has(num));
          return new Set([...keep, ...extras].slice(0, SLOT_COUNT));
        }
        return next;
      });
    } else if (pickModal === "exclude") {
      const nextExcluded = new Set(modalDraft);
      setExcludedNums(nextExcluded);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const num of nextExcluded) next.delete(num);
        return next;
      });
      setFixedNums((prev) => {
        const next = new Set(prev);
        for (const num of nextExcluded) next.delete(num);
        return next;
      });
    }
    setPickModal(null);
    setModalDraft(emptySelection());
    setModalHint(null);
    setError(null);
  }

  function closePickModal() {
    setPickModal(null);
    setModalDraft(emptySelection());
    setModalHint(null);
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

  function clearSelectedKeepFixed() {
    setSelected(new Set(fixedNums));
    setError(null);
  }

  function resetEditorSelection() {
    setSelected(emptySelection());
    setAutoSemi(false);
    setEditingGameId(null);
    setFixedNums(emptySelection());
    setExcludedNums(emptySelection());
    setPickModal(null);
    setModalDraft(emptySelection());
    setModalHint(null);
    setError(null);
  }

  function issueWorkingAsQrSheet(): boolean {
    if (tabWorkingGames.length === 0) {
      setError("선택한 번호가 없습니다. 번호를 고른 뒤 QR을 만들어 주세요.");
      return false;
    }
    if (tabWorkingGames.length > GAMES_PER_SLIP) {
      setError(`1장당 최대 ${GAMES_PER_SLIP}게임까지 가능합니다.`);
      return false;
    }

    const games = tabWorkingGames.map((game) => ({ ...game }));
    const replaceIndex = reissueSheetIndex;
    let targetIndex = tabIssuedSheets.length;

    setIssuedSheets((prev) => {
      const nextSheets = [...prev[numberTab]];
      if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < nextSheets.length) {
        nextSheets[replaceIndex] = games;
        targetIndex = replaceIndex;
      } else {
        targetIndex = nextSheets.length;
        nextSheets.push(games);
      }
      return { ...prev, [numberTab]: nextSheets };
    });
    setTabWorkingGames(() => []);
    resetEditorSelection();
    setReissueSheetIndex(null);
    if (!createdAt) setCreatedAt(new Date().toISOString());
    setActiveSheetIndex(targetIndex);
    setView("qr");
    setMessage(
      replaceIndex !== null
        ? "QR을 수정 발행했습니다."
        : `QR슬립지(${games.length}게임)가 추가되었습니다.`,
    );
    return true;
  }

  function openQrView() {
    if (tabWorkingGames.length > 0) {
      issueWorkingAsQrSheet();
      return;
    }
    if (tabIssuedSheets.length === 0) return;
    resetEditorSelection();
    setView("qr");
  }

  function openNewGameEditor() {
    resetEditorSelection();
    setReissueSheetIndex(null);
    setView("editor");
  }

  function openEditActiveSheet() {
    if (numberTab !== "fixed") return;
    const sheet = tabIssuedSheets[activeSheetIndex];
    if (!sheet || sheet.length === 0) return;

    resetEditorSelection();
    setWorkingFixed(sheet.map((game) => ({ ...game })));
    setReissueSheetIndex(activeSheetIndex);
    setView("editor");
    setMessage("번호를 수정한 뒤 하단 「슬립지 QR코드 만들기」로 다시 발행하세요.");
  }

  function openGameEditor(game: SlipGame) {
    const tabIndex = tabWorkingGames.findIndex((row) => row.id === game.id);
    if (tabIndex >= 0) {
      setActiveSheetIndex(0);
    }
    setEditingGameId(game.id);
    setSelected(new Set(game.numbers));
    setAutoSemi(game.numbers.length > 0 && game.numbers.length < 6);
    setFixedNums(emptySelection());
    setExcludedNums(emptySelection());
    setPickModal(null);
    setModalDraft(emptySelection());
    setModalHint(null);
    setError(null);
    setView("editor");
  }

  function switchTab(tab: SlipNumberTab) {
    setNumberTab(tab);
    setActiveSheetIndex(0);
    setGamesOpen(false);
    resetEditorSelection();
    setReissueSheetIndex(null);
    const issuedCount = countIssuedSheetsForCategory(issuedSheets, tab);
    const workingCount =
      tab === "fixed" ? workingFixed.length : workingRegular.length;
    if (issuedCount > 0) {
      setView("qr");
    } else if (workingCount > 0) {
      setView("editor");
    } else {
      setView("list");
    }
  }

  function removeGame(id: string) {
    setTabWorkingGames((prev) => {
      const next = prev.filter((g) => g.id !== id);
      if (next.length === 0 && tabIssuedSheets.length === 0) {
        setCreatedAt(null);
        setView("list");
      }
      return next;
    });
    if (editingGameId === id) resetEditorSelection();
  }

  function buildGameFromSelection(): SlipGame | null {
    const nums = selectedList;
    if (nums.length === 0) {
      if (!autoSemi) {
        setError("번호를 선택하거나 자동/반자동을 켜 주세요.");
        return null;
      }
    } else if (nums.length < 6 && !autoSemi) {
      setError("번호 6개를 선택하거나 자동/반자동을 켜 주세요.");
      return null;
    }

    const mode: SlipGame["mode"] = nums.length === 0 ? "A" : "M";
    const source = numberTab === "fixed" ? "mypicks" : "manual";
    return {
      id: editingGameId ?? newId(),
      numbers: nums.length === 0 ? [] : [...nums],
      mode,
      source,
      sourceLabel: SLIP_SOURCE_LABELS[source],
    };
  }

  function handleComplete() {
    setError(null);
    const game = buildGameFromSelection();
    if (!game) return;

    if (editingGameId) {
      setTabWorkingGames((prev) =>
        prev.map((row) =>
          row.id === editingGameId ? { ...row, ...game, id: row.id } : row,
        ),
      );
      setMessage("번호를 수정했습니다.");
      resetEditorSelection();
      return;
    }

    if (tabWorkingGames.length >= GAMES_PER_SLIP) {
      setError(`1장에 최대 ${GAMES_PER_SLIP}게임입니다. QR을 만든 뒤 다음 장을 추가하세요.`);
      return;
    }

    if (!createdAt) setCreatedAt(new Date().toISOString());
    setTabWorkingGames((prev) => [...prev, game]);
    resetEditorSelection();
    setMessage("선택 번호에 추가했습니다.");
    window.requestAnimationFrame(() => {
      picksSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function markSheetPrintDone(sheetIndex: number): boolean {
    const sheet = tabIssuedSheets[sheetIndex];
    const anchorId = sheet?.[0]?.id;
    if (!anchorId || printDoneSheetIds.has(anchorId)) return false;

    const nextIds = new Set([...printDoneSheetIds, anchorId]);
    setPrintDoneSheetIds(nextIds);
    saveSlipDraft({
      games: flattenIssuedSheets(issuedSheets),
      issuedSheets,
      selected: [],
      autoSemi: false,
      printDoneSheetIds: [...nextIds],
      createdAt: createdAt ?? undefined,
    });
    void syncPrintDoneFromSlipSheet(sheet);
    void syncIssuedTicketSheet(sheet).catch(() => {});
    notifyPrintDoneInvalidate();
    return true;
  }

  function removeSlipSheet(sheetIndex: number) {
    const removed = tabIssuedSheets[sheetIndex];
    const anchorId = removed?.[0]?.id;

    setIssuedSheets((prev) => {
      const nextSheets = [...prev[numberTab]];
      nextSheets.splice(sheetIndex, 1);
      const next = { ...prev, [numberTab]: nextSheets };
      if (
        next.regular.length === 0 &&
        next.fixed.length === 0 &&
        workingRegular.length === 0 &&
        workingFixed.length === 0
      ) {
        setCreatedAt(null);
        setView("list");
      } else if (nextSheets.length === 0 && tabWorkingGames.length === 0) {
        setView("list");
      }
      return next;
    });

    if (anchorId) {
      setPrintDoneSheetIds((prev) => {
        const next = new Set(prev);
        next.delete(anchorId);
        return next;
      });
    }

    setMessage(`QR슬립지(${removed?.length ?? 0}게임)를 삭제했습니다.`);
  }

  function removeRegularGameById(gameId: string) {
    setWorkingRegular((prev) => prev.filter((game) => game.id !== gameId));
    setIssuedSheets((prev) => ({
      ...prev,
      regular: prev.regular
        .map((sheet) => sheet.filter((game) => game.id !== gameId))
        .filter((sheet) => sheet.length > 0),
    }));
  }

  function promoteToFixed(gameId: string) {
    setError(null);
    const beforeFixedIds = new Set(
      filterSlipGamesByCategory(games, "fixed").map((game) => game.id),
    );
    const { result, games: next } = promoteSlipGameToFixed(games, gameId);
    if (result === "ok") {
      const promoted = filterSlipGamesByCategory(next, "fixed").filter(
        (game) => !beforeFixedIds.has(game.id),
      );
      removeRegularGameById(gameId);
      if (promoted.length > 0) {
        setWorkingFixed((prev) => [...prev, ...promoted]);
      }
      setMessage("고정번호로 보관했습니다.");
      return;
    }
    if (result === "duplicate") {
      setError("이미 고정번호에 있는 조합입니다.");
    } else {
      setError("보관할 번호를 찾을 수 없습니다.");
    }
  }

  function confirmPromoteSheetToFixed() {
    setError(null);
    const ids = activeSheetGames.map((game) => game.id);
    const beforeFixedIds = new Set(
      filterSlipGamesByCategory(games, "fixed").map((game) => game.id),
    );
    const { games: next, promotedCount, skippedDuplicate } =
      promoteSlipGamesToFixed(games, ids);

    setPromoteDialogOpen(false);

    if (promotedCount > 0) {
      setIssuedSheets((prev) => {
        const sheets = [...prev.regular];
        sheets.splice(activeSheetIndex, 1);
        return { ...prev, regular: sheets };
      });
      const promoted = filterSlipGamesByCategory(next, "fixed").filter(
        (game) => !beforeFixedIds.has(game.id),
      );
      if (promoted.length > 0) {
        setWorkingFixed((prev) => [...prev, ...promoted]);
      }
      if (skippedDuplicate > 0) {
        setMessage(
          `${promotedCount}게임을 보관했습니다. (${skippedDuplicate}게임은 이미 고정번호에 있어 제외)`,
        );
      } else {
        setMessage(`${promotedCount}게임을 고정번호로 보관했습니다.`);
      }
    } else if (skippedDuplicate > 0) {
      setError("이미 고정번호에 있는 조합입니다.");
    } else {
      setError("보관할 번호를 찾을 수 없습니다.");
    }
  }

  const showPromoteToFixed = numberTab === "regular";

  const createdAtLabel = createdAt ? formatCreatedAt(createdAt) : null;
  const activeSheetGames = useMemo(
    () => tabIssuedSheets[activeSheetIndex] ?? [],
    [tabIssuedSheets, activeSheetIndex],
  );

  const importHref = "/saved-numbers";
  const importLabel = "나의 로또 번호 불러오기";

  return (
    <div
      className={`page-content page-content--slip${
        showEditorFooter ? " page-content--slip-editor" : ""
      }`}
    >
      <SlipPageTabs
        activeTab={numberTab}
        regularCount={regularGameCount}
        fixedCount={fixedGameCount}
        onChange={switchTab}
      />

      {showQrView ? (
        <div className="mobile-slip-manage__links mobile-slip-manage__links--under-tabs">
          <button
            type="button"
            onClick={openNewGameEditor}
            className="mobile-slip-manage__link"
          >
            <span
              className={`slip-game-category slip-game-category--${numberTab}`}
            >
              {SLIP_GAME_CATEGORY_LABELS[numberTab]}
            </span>
            <span className="mobile-slip-manage__link-text">슬립지 만들기</span>
            <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
          </button>
        </div>
      ) : null}

      {showQrView ? (
        <>
          <SlipInlineQr
            sheets={tabIssuedSheets}
            activeSheetIndex={activeSheetIndex}
            onSheetChange={setActiveSheetIndex}
            onDeleteSheet={() => removeSlipSheet(activeSheetIndex)}
            onEditSheet={numberTab === "fixed" ? openEditActiveSheet : undefined}
            printDoneSheetIds={printDoneSheetIds}
            onMarkPrintDone={markSheetPrintDone}
          />

          {showPromoteToFixed ? (
            <div className="mobile-slip-qr__promote">
              <button
                type="button"
                onClick={() => setPromoteDialogOpen(true)}
                className="mobile-slip-qr__promote-btn"
              >
                <span className="slip-game-category slip-game-category--fixed">
                  {SLIP_GAME_CATEGORY_LABELS.fixed}
                </span>
                고정번호 이동
                <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
              </button>
            </div>
          ) : null}

          <SlipGamesAccordion
            games={activeSheetGames}
            open={gamesOpen}
            onToggle={() => setGamesOpen((v) => !v)}
            createdAt={createdAtLabel}
          />
        </>
      ) : showEditor ? (
        <>
          <section className="mobile-slip-editor">
            {!isEditing ? (
              <button
                type="button"
                className="mobile-slip-editor__import-btn"
                onClick={() => navigate(importHref)}
              >
                <span className="mobile-slip-editor__step">1.</span>
                {importLabel}
                <ChevronRight
                  className="mobile-slip-editor__import-icon"
                  aria-hidden
                />
              </button>
            ) : null}

            <div className="mobile-slip-editor__head">
              <h2 className="mobile-slip-editor__title">
                {!isEditing ? (
                  <>
                    <span className="mobile-slip-editor__step">2.</span>
                    번호 직접 선택
                  </>
                ) : (
                  "번호 수정"
                )}
              </h2>
            </div>

            <div className="mobile-slip-editor__constraints">
              <button
                type="button"
                onClick={openFixedModal}
                className={`mobile-slip-editor__constraint-btn${
                  fixedNums.size > 0
                    ? " mobile-slip-editor__constraint-btn--fixed-active"
                    : ""
                }`}
              >
                고정수{fixedNums.size > 0 ? ` ${fixedNums.size}` : ""}
              </button>
              <button
                type="button"
                onClick={openExcludeModal}
                className={`mobile-slip-editor__constraint-btn${
                  excludedNums.size > 0
                    ? " mobile-slip-editor__constraint-btn--exclude-active"
                    : ""
                }`}
              >
                제외수{excludedNums.size > 0 ? ` ${excludedNums.size}` : ""}
              </button>
            </div>

            <NumberPickBoard
              selected={selected}
              excluded={excludedNums}
              onToggle={toggleNumber}
              autoSemi={autoSemi}
              onAutoSemiChange={setAutoSemi}
              variant="slip"
              footer={
                <div className="mobile-slip-editor__board-actions">
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    className="mobile-slip-editor__board-action"
                  >
                    자동 채우기
                  </button>
                  <ConfirmActionButton
                    label="선택 지우기"
                    tone="neutral"
                    className="mobile-slip-editor__board-action"
                    confirmTitle="선택 지우기"
                    confirmMessage="지금 선택한 번호를 지우고 고정수만 남길까요?"
                    confirmLabel="지우기"
                    onConfirm={clearSelectedKeepFixed}
                  />
                </div>
              }
            />

            <div className="mobile-slip-editor__actions">
              <button
                type="button"
                onClick={resetEditorSelection}
                className="mobile-slip-editor__btn mobile-slip-editor__btn--ghost"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="mobile-slip-editor__btn mobile-slip-editor__btn--primary"
              >
                {isEditing ? "수정 완료" : "선택 완료"}
              </button>
            </div>
          </section>

          <section ref={picksSectionRef} className="mobile-slip-picks">
            <div className="mobile-slip-picks__head">
              <h2 className="mobile-slip-picks__title">선택 번호</h2>
              <span className="mobile-slip-picks__count">총 {tabWorkingGames.length}게임</span>
            </div>

            {tabWorkingGames.length === 0 ? (
              <p className="mobile-slip-picks__empty">번호를 선택해주세요.</p>
            ) : (
              <ul className="mobile-slip-picks__list">
                {tabWorkingGames.map((game, index) => (
                  <li
                    key={game.id}
                    className={`mobile-slip-picks__item${editingGameId === game.id ? " mobile-slip-picks__item--active" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => openGameEditor(game)}
                      className="mobile-slip-picks__row"
                    >
                      <SlipBallRow
                        game={game}
                        slotLabel={SLOT_LABELS[index % SLOT_LABELS.length]}
                      />
                    </button>
                    <div className="mobile-slip-picks__actions">
                      {showPromoteToFixed ? (
                        <button
                          type="button"
                          className="slip-promote-btn slip-promote-btn--compact"
                          onClick={() => promoteToFixed(game.id)}
                        >
                          고정 보관
                        </button>
                      ) : null}
                      <DeleteIconButton
                        className="mobile-slip-picks__delete"
                        confirmTitle="번호 삭제"
                        confirmMessage={`${index + 1}번째 게임을 삭제할까요?`}
                        onConfirm={() => removeGame(game.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : !hasSlipContent ? (
        <SlipEmptyState tab={numberTab} onCreate={openNewGameEditor} />
      ) : null}

      {(error || message) && (
        <p
          className={`text-sm text-center mt-3 ${error ? "text-red-600" : "text-emerald-600"}`}
          role="status"
        >
          {error ?? message}
        </p>
      )}

      {showEditorFooter ? (
        <div className="page-sticky-footer">
          <div className="page-sticky-footer__inner">
            <button
              type="button"
              disabled={tabWorkingGames.length === 0}
              onClick={openQrView}
              className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-40"
            >
              {reissueSheetIndex !== null ? "QR 수정 발행" : "슬립지 QR코드 만들기"}
            </button>
          </div>
        </div>
      ) : null}

      <SlipPromoteToFixedDialog
        open={promoteDialogOpen}
        games={activeSheetGames}
        onCancel={() => setPromoteDialogOpen(false)}
        onConfirm={confirmPromoteSheetToFixed}
      />

      {pickModal ? (
        <NumberPickModal
          kind={pickModal}
          draft={modalDraft}
          blocked={pickModal === "fixed" ? excludedNums : fixedNums}
          maxCount={
            pickModal === "fixed" ? MAX_FIXED_NUMBERS : MAX_EXCLUDED_NUMBERS
          }
          hint={modalHint}
          variant="slip"
          onToggle={toggleModalDraft}
          onReset={() => {
            setModalDraft(emptySelection());
            setModalHint(null);
          }}
          onConfirm={confirmPickModal}
          onClose={closePickModal}
        />
      ) : null}
    </div>
  );
}
