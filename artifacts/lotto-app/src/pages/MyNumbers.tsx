import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, Trash2, Trash, Scale, Brain, Shuffle, CalendarDays,
  ClipboardList, BarChart2, FlaskConical, Mail, Send,
  X as XIcon, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  FolderOpen, Folder, Activity, LayoutGrid, Hash, Link2, Sparkles, Crown,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import MobileSlipQr from "@/components/MobileSlipQr";
import StorageSaveNotice from "@/components/StorageSaveNotice";
import StoreQrButton from "@/components/StoreQrButton";
import WinBadge, { WinPendingBadge } from "@/components/WinBadge";
import WinNotificationSettings from "@/components/WinNotificationSettings";
import { deleteNumberSet, clearAllSavedSets, parseRoundNo, checkWinResult } from "@/utils/savedNumbers";
import type { SavedSet } from "@/utils/savedNumbers";
import type { GeneratorMode, LottoRound } from "@/data/types";
import { useLottoContext } from "@/context/LottoDataContext";
import { useSavedSets } from "@/hooks/useSavedSets";

const MODE_META: Record<GeneratorMode, { label: string; color: string; icon: React.ElementType }> = {
  balanced:    { label: "균형 필터",   color: "bg-emerald-100 text-emerald-700", icon: Scale },
  weighted:    { label: "AI 가중치",   color: "bg-violet-100 text-violet-700",   icon: Brain },
  random:      { label: "순수 랜덤",   color: "bg-rose-100 text-rose-700",       icon: Shuffle },
  monte:       { label: "몬테카를로",  color: "bg-indigo-100 text-indigo-700",   icon: FlaskConical },
  delta:       { label: "델타 시스템", color: "bg-teal-100 text-teal-700",       icon: Activity },
  sector:      { label: "구간 분산",   color: "bg-sky-100 text-sky-700",         icon: LayoutGrid },
  tail:        { label: "끝수 기반",   color: "bg-pink-100 text-pink-700",       icon: Hash },
  consecutive: { label: "연번 기반",   color: "bg-lime-100 text-lime-700",       icon: Link2 },
  lottoking:   { label: "로또킹",      color: "bg-amber-100 text-amber-800",   icon: Crown },
  saju:        { label: "사주",        color: "bg-purple-100 text-purple-700",   icon: Sparkles },
};

function getModeMeta(mode: string, subLabel?: string | null) {
  const meta = MODE_META[mode as GeneratorMode];
  if (meta) return meta;
  return {
    label: subLabel || mode || "저장",
    color: "bg-gray-100 text-gray-600",
    icon: Bookmark,
  };
}

const RANK_SUMMARY = [
  { key: "1", label: "1등", color: "bg-yellow-400 text-yellow-900" },
  { key: "2", label: "2등", color: "bg-orange-400 text-white" },
  { key: "3", label: "3등", color: "bg-purple-500 text-white" },
  { key: "4", label: "4등", color: "bg-blue-400 text-white" },
  { key: "5", label: "5등", color: "bg-emerald-400 text-white" },
];

interface RankStats {
  checkedSets: number;
  totalSets: number;
  ranks: Record<string, number>;
  noWin: number;
}

function computeStats(savedList: SavedSet[], roundMap: Map<number, LottoRound>): RankStats {
  const ranks: Record<string, number> = {};
  let noWin = 0;
  let checkedSets = 0;
  let totalSets = 0;
  for (const saved of savedList) {
    const roundNo = parseRoundNo(saved.roundTag);
    const round = roundNo !== null ? (roundMap.get(roundNo) ?? null) : null;
    for (const s of saved.sets) {
      totalSets++;
      if (!round) continue;
      checkedSets++;
      const result = checkWinResult(s.numbers, round);
      if (result.rank !== null) {
        const key = String(result.rank);
        ranks[key] = (ranks[key] ?? 0) + 1;
      } else {
        noWin++;
      }
    }
  }
  return { checkedSets, totalSets, ranks, noWin };
}

function StatsSummaryCard({ stats }: { stats: RankStats }) {
  const hasAnyWin = RANK_SUMMARY.some((r) => (stats.ranks[r.key] ?? 0) > 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 sm:px-5 sm:py-5 mb-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <BarChart2 className="w-5 h-5 text-indigo-500 shrink-0" />
          <span className="text-base sm:text-lg font-bold text-gray-900">전체 당첨 결과 요약</span>
        </div>
        <span className="text-sm text-gray-500 sm:ml-auto">
          {stats.checkedSets}개 집계 / 전체 {stats.totalSets}개
        </span>
      </div>
      {stats.checkedSets === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">아직 결과가 집계된 번호 세트가 없습니다</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {RANK_SUMMARY.map((r) => {
              const count = stats.ranks[r.key] ?? 0;
              return (
                <div
                  key={r.key}
                  className={`flex flex-col items-center justify-center rounded-2xl px-2 py-3 sm:px-3 sm:py-4 min-h-[76px] sm:min-h-[88px] ${
                    count > 0 ? `${r.color} shadow-sm` : "bg-gray-50 text-gray-300"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl font-extrabold leading-none tabular-nums">{count}</span>
                  <span className={`text-sm sm:text-base font-bold mt-1.5 sm:mt-2 ${count > 0 ? "opacity-90" : "opacity-70"}`}>
                    {r.label}
                  </span>
                </div>
              );
            })}
            <div className="flex flex-col items-center justify-center rounded-2xl px-2 py-3 sm:px-3 sm:py-4 min-h-[76px] sm:min-h-[88px] bg-gray-100 text-gray-500 col-span-2 sm:col-span-1 md:col-span-1">
              <span className="text-2xl sm:text-3xl font-extrabold leading-none tabular-nums">{stats.noWin}</span>
              <span className="text-sm sm:text-base font-bold mt-1.5 sm:mt-2 opacity-80">낙첨</span>
            </div>
          </div>
          {!hasAnyWin && (
            <p className="text-sm text-gray-400 mt-4 text-center">아직 당첨 내역이 없습니다. 행운을 빕니다!</p>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface Toast { id: number; type: "success" | "error"; message: string; }
let toastSeq = 0;

/* ── Round Folder Component ── */
interface RoundFolderProps {
  roundTag: string;
  savedList: SavedSet[];
  roundMap: Map<number, LottoRound>;
  defaultOpen: boolean;
  onDelete: (id: string) => void;
  onShowQr: (numberSets: number[][], title: string) => void;
}

function RoundFolder({ roundTag, savedList, roundMap, defaultOpen, onDelete, onShowQr }: RoundFolderProps) {
  const [open, setOpen] = useState(defaultOpen);

  const roundNo = parseRoundNo(roundTag);
  const round = roundNo !== null ? (roundMap.get(roundNo) ?? null) : null;
  const hasResult = round !== null;
  const stats = useMemo(() => computeStats(savedList, roundMap), [savedList, roundMap]);
  const totalGames = savedList.reduce((sum, s) => sum + s.sets.length, 0);

  const winningSet = round
    ? new Set([round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6])
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Folder header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        {open
          ? <FolderOpen className="w-6 h-6 text-amber-500 shrink-0" />
          : <Folder className="w-6 h-6 text-amber-400 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base break-words">{roundTag}</span>
            {hasResult ? (
              <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">추첨 완료</span>
            ) : (
              <span className="text-xs bg-amber-50 text-amber-600 font-bold px-2.5 py-1 rounded-full">추첨 대기</span>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-1.5">
            <span className="text-sm text-gray-500">{savedList.length}개 조합 · {totalGames}게임</span>
            {hasResult && stats.checkedSets > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {RANK_SUMMARY.map((r) => {
                  const cnt = stats.ranks[r.key] ?? 0;
                  if (cnt === 0) return null;
                  return (
                    <span key={r.key} className={`text-sm font-bold px-3 py-1.5 rounded-lg ${r.color}`}>
                      {r.label} {cnt}
                    </span>
                  );
                })}
                {RANK_SUMMARY.every((r) => (stats.ranks[r.key] ?? 0) === 0) && (
                  <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">낙첨</span>
                )}
              </div>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        }
      </button>

      {/* Winning numbers bar (when result available) */}
      <AnimatePresence>
        {open && hasResult && round && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 py-3 bg-amber-50 border-t border-amber-100">
              <p className="text-sm sm:text-base font-bold text-amber-800 mb-2">당첨번호</p>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {[round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6].map((n, i) => (
                  <LottoBall key={i} number={n} size="responsive" />
                ))}
                <span className="text-amber-500 font-bold text-sm sm:text-base mx-0.5">+</span>
                <LottoBall number={round.bnusNo} size="responsive" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved set cards */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              {savedList.map((saved) => {
                const meta = getModeMeta(saved.mode, saved.subLabel);
                const ModeIcon = meta.icon;
                return (
                  <div key={saved.id} className="px-4 py-4">
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full ${meta.color}`}>
                          <ModeIcon className="w-4 h-4" />
                          {meta.label}
                        </span>
                        {saved.subLabel && (
                          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full ${meta.color} opacity-80`}>
                            {saved.subLabel}
                          </span>
                        )}
                        <span className="text-sm text-gray-400">{formatDate(saved.savedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onDelete(saved.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Number sets */}
                    <div className="space-y-2.5 sm:space-y-3">
                      {saved.sets.map((s, idx) => {
                        const result = round ? checkWinResult(s.numbers, round) : null;
                        return (
                          <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className="text-sm sm:text-base font-bold text-gray-400 w-6 sm:w-7 text-right shrink-0 pt-1">{idx + 1}</span>
                              <div className="flex gap-1.5 sm:gap-2 flex-wrap flex-1 min-w-0">
                                {s.numbers.map((n, i) => {
                                  const isMatch = winningSet ? winningSet.has(n) : false;
                                  return (
                                    <div key={i} className={`rounded-full transition-all ${isMatch ? "ring-2 ring-offset-1 sm:ring-offset-2 ring-yellow-400" : ""}`}>
                                      <LottoBall number={n} size="responsive" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="pl-8 sm:pl-0 sm:shrink-0">
                              {result ? (
                                <WinBadge result={result} className="w-full sm:w-auto justify-center sm:justify-start" />
                              ) : !round ? (
                                <WinPendingBadge className="w-full sm:w-auto justify-center sm:justify-start" />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <StoreQrButton
                      className="mt-3"
                      size="md"
                      onClick={() => {
                        const numberSets = saved.sets.map((s) => s.numbers);
                        const title = saved.subLabel
                          ? `${meta.label} · ${saved.subLabel}`
                          : meta.label;
                        onShowQr(numberSets, title);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Page ── */
export default function MyNumbers() {
  const { sets, loading, refresh } = useSavedSets();
  const [confirmClear, setConfirmClear] = useState(false);
  const { allRounds } = useLottoContext();

  const [slipQr, setSlipQr] = useState<{ numberSets: number[][]; title: string } | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState("ljh4497@naver.com");
  const [emailSending, setEmailSending] = useState(false);
  const [emailFilter, setEmailFilter] = useState<"all" | "recent" | "round">("all");
  const [selectedRoundTag, setSelectedRoundTag] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimers.current.delete(id);
    }, 4000);
    toastTimers.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteNumberSet(id);
    await refresh();
  }, [refresh]);

  const handleClearAll = useCallback(async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setConfirmClear(false);
    await clearAllSavedSets();
    await refresh();
  }, [confirmClear, refresh]);

  const handleSendEmail = useCallback(async () => {
    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes("@")) { addToast("error", "유효한 이메일 주소를 입력해주세요"); return; }
    if (emailFilter === "round" && !selectedRoundTag) { addToast("error", "회차를 선택해주세요"); return; }
    setEmailSending(true);

    let filter: Record<string, unknown>;
    if (emailFilter === "recent") filter = { type: "recent", count: 5 };
    else if (emailFilter === "round") filter = { type: "round", roundTag: selectedRoundTag };
    else filter = { type: "all" };

    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, filter }),
      });
      const data: unknown = await res.json();
      const errorMsg = data !== null && typeof data === "object" && "error" in data
        ? String((data as Record<string, unknown>).error) : "발송 실패";
      if (!res.ok) throw new Error(errorMsg);
      addToast("success", `${trimmed}으로 발송했습니다`);
      setShowEmailForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "이메일 발송 중 오류가 발생했습니다";
      addToast("error", msg);
    } finally {
      setEmailSending(false);
    }
  }, [emailInput, emailFilter, selectedRoundTag, addToast]);

  const uniqueRoundTags = useMemo(() => {
    const seen = new Set<string>();
    const tags: string[] = [];
    for (const s of sets) {
      if (!seen.has(s.roundTag)) { seen.add(s.roundTag); tags.push(s.roundTag); }
    }
    return tags;
  }, [sets]);

  useEffect(() => {
    if (uniqueRoundTags.length === 0) { setSelectedRoundTag(""); }
    else if (selectedRoundTag && !uniqueRoundTags.includes(selectedRoundTag)) { setSelectedRoundTag(uniqueRoundTags[0]); }
  }, [uniqueRoundTags, selectedRoundTag]);

  const roundMap = useMemo(() => {
    const map = new Map<number, LottoRound>();
    for (const r of allRounds) map.set(r.drwNo, r);
    return map;
  }, [allRounds]);

  const overallStats = useMemo(() => computeStats(sets, roundMap), [sets, roundMap]);

  // Group sets by roundTag, sorted descending
  const groupedByRound = useMemo(() => {
    const groups = new Map<string, SavedSet[]>();
    for (const s of sets) {
      const arr = groups.get(s.roundTag) ?? [];
      arr.push(s);
      groups.set(s.roundTag, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const aNo = parseRoundNo(a[0]) ?? 0;
      const bNo = parseRoundNo(b[0]) ?? 0;
      return bNo - aNo;
    });
  }, [sets]);

  const latestRoundTag = groupedByRound[0]?.[0] ?? null;
  const totalGames = sets.reduce((sum, s) => sum + s.sets.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-24 min-w-0">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-xs ${
                t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {t.type === "success"
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              }
              <span className="flex-1 leading-snug">{t.message}</span>
              <button onClick={() => dismissToast(t.id)} className="text-current opacity-50 hover:opacity-100 shrink-0">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="mb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-500 shrink-0" />
            추출 번호
          </h2>
          {sets.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEmailForm((v) => !v)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                showEmailForm
                  ? "border-blue-400 text-blue-600 bg-blue-50"
                  : "border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              결과 메일
            </button>
            <button
              onClick={handleClearAll}
              onBlur={() => setConfirmClear(false)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                confirmClear
                  ? "border-red-400 text-red-600 bg-red-50"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Trash className="w-3.5 h-3.5" />
              {confirmClear ? "정말 삭제할까요?" : "전체 삭제"}
            </button>
          </div>
        )}
        </div>
        <p className="text-base text-gray-600 mt-1.5 leading-relaxed">
          추천·로또킹·사주에서 저장한 번호와 당첨 결과를 확인합니다.
        </p>
        <StorageSaveNotice className="mt-2" />
      </div>

      <WinNotificationSettings onToast={addToast} />

      {/* Email form */}
      <AnimatePresence>
        {showEmailForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  당첨 결과를 이메일로 받기
                </p>
                <button onClick={() => setShowEmailForm(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 mb-3">
                {(["all", "recent", "round"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setEmailFilter(opt); if (opt === "round" && !selectedRoundTag && uniqueRoundTags.length > 0) setSelectedRoundTag(uniqueRoundTags[0]); }}
                    className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg border transition-colors ${
                      emailFilter === opt ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-blue-200 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {opt === "all" ? "전체" : opt === "recent" ? "최근 5개" : "특정 회차"}
                  </button>
                ))}
              </div>
              {emailFilter === "round" && (
                <div className="mb-3">
                  <select
                    value={selectedRoundTag}
                    onChange={(e) => setSelectedRoundTag(e.target.value)}
                    disabled={emailSending}
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
                  >
                    {uniqueRoundTags.length === 0 ? (
                      <option value="">회차 없음</option>
                    ) : (
                      uniqueRoundTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)
                    )}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !emailSending && handleSendEmail()}
                  placeholder="이메일 주소 입력"
                  disabled={emailSending}
                  className="flex-1 px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {emailSending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />발송 중</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" />발송</>
                  )}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-blue-500 leading-relaxed">
                {emailFilter === "all" && "저장된 모든 번호의 당첨 결과가 이메일로 전송됩니다."}
                {emailFilter === "recent" && "가장 최근에 저장한 5개 항목의 결과가 이메일로 전송됩니다."}
                {emailFilter === "round" && `선택한 회차(${selectedRoundTag || "—"})의 번호 결과가 이메일로 전송됩니다.`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-7 h-7 border-2 border-amber-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      ) : sets.length === 0 ? (
        <div className="text-center py-20 text-gray-300">
          <ClipboardList className="w-14 h-14 mx-auto mb-4 opacity-40" />
          <p className="text-sm font-medium text-gray-400">저장된 추출 번호가 없습니다</p>
          <p className="text-xs text-gray-300 mt-1">추천·로또킹·사주에서 저장해 보세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall stats */}
          <StatsSummaryCard stats={overallStats} />

          {/* Summary bar */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-gray-500">
              {groupedByRound.length}개 회차 · 총 {totalGames}게임
            </p>
            <CalendarDays className="w-4 h-4 text-gray-400" />
          </div>

          {/* Round folders */}
          <AnimatePresence initial={false}>
            {groupedByRound.map(([roundTag, savedList]) => (
              <motion.div
                key={roundTag}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22 }}
              >
                <RoundFolder
                  roundTag={roundTag}
                  savedList={savedList}
                  roundMap={roundMap}
                  defaultOpen={roundTag === latestRoundTag}
                  onDelete={handleDelete}
                  onShowQr={(numberSets, title) => setSlipQr({ numberSets, title })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <MobileSlipQr
        numberSets={slipQr?.numberSets ?? []}
        open={slipQr !== null}
        onClose={() => setSlipQr(null)}
        title={slipQr?.title ?? "번호 QR"}
      />
    </div>
  );
}
