import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, Trash2, Trash, Scale, Brain, Shuffle, CalendarDays,
  ClipboardList, BarChart2, Printer, FlaskConical, Mail, Send,
  X as XIcon, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  FolderOpen, Folder, Activity, LayoutGrid, Hash, Link2,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import { loadSavedSets, deleteNumberSet, clearAllSavedSets, parseRoundNo, checkWinResult } from "@/utils/savedNumbers";
import type { SavedSet, WinResult } from "@/utils/savedNumbers";
import type { GeneratedNumbers, GeneratorMode, LottoRound } from "@/data/types";
import { useLottoContext } from "@/context/LottoDataContext";
import { printLottoNumbers } from "@/utils/printLotto";
import PrintPreview from "@/components/PrintPreview";
import type { PrintCalibration } from "@/utils/printCalibration";

const MODE_META: Record<GeneratorMode, { label: string; color: string; icon: React.ElementType }> = {
  balanced:    { label: "균형 필터",   color: "bg-emerald-100 text-emerald-700", icon: Scale },
  weighted:    { label: "AI 가중치",   color: "bg-violet-100 text-violet-700",   icon: Brain },
  random:      { label: "순수 랜덤",   color: "bg-rose-100 text-rose-700",       icon: Shuffle },
  monte:       { label: "몬테카를로",  color: "bg-indigo-100 text-indigo-700",   icon: FlaskConical },
  delta:       { label: "델타 시스템", color: "bg-teal-100 text-teal-700",       icon: Activity },
  sector:      { label: "구간 분산",   color: "bg-sky-100 text-sky-700",         icon: LayoutGrid },
  tail:        { label: "끝수 기반",   color: "bg-pink-100 text-pink-700",       icon: Hash },
  consecutive: { label: "연번 기반",   color: "bg-lime-100 text-lime-700",       icon: Link2 },
};

const RANK_STYLE: Record<string, string> = {
  "1": "bg-yellow-400 text-yellow-900 border-yellow-500",
  "2": "bg-orange-400 text-white border-orange-500",
  "3": "bg-purple-500 text-white border-purple-600",
  "4": "bg-blue-400 text-white border-blue-500",
  "5": "bg-emerald-400 text-white border-emerald-500",
};

function WinBadge({ result }: { result: WinResult }) {
  if (result.rank === null) {
    return (
      <span className="text-[10px] font-medium text-gray-300 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 whitespace-nowrap">
        {result.matchCount}개 일치 낙첨
      </span>
    );
  }
  const style = RANK_STYLE[String(result.rank)] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap ${style}`}>
      {result.label}
    </span>
  );
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-bold text-gray-800">전체 당첨 결과 요약</span>
        <span className="ml-auto text-xs text-gray-400">
          {stats.checkedSets}개 집계됨 / 전체 {stats.totalSets}개
        </span>
      </div>
      {stats.checkedSets === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">아직 결과가 집계된 번호 세트가 없습니다</p>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {RANK_SUMMARY.map((r) => {
              const count = stats.ranks[r.key] ?? 0;
              return (
                <div key={r.key} className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-[52px] ${count > 0 ? r.color : "bg-gray-50 text-gray-300"}`}>
                  <span className="text-base font-extrabold leading-tight">{count}</span>
                  <span className="text-[10px] font-semibold mt-0.5 opacity-80">{r.label}</span>
                </div>
              );
            })}
            <div className="flex flex-col items-center rounded-xl px-3 py-2 min-w-[52px] bg-gray-50 text-gray-400">
              <span className="text-base font-extrabold leading-tight">{stats.noWin}</span>
              <span className="text-[10px] font-semibold mt-0.5 opacity-80">낙첨</span>
            </div>
          </div>
          {!hasAnyWin && (
            <p className="text-[11px] text-gray-400 mt-3 text-center">아직 당첨 내역이 없습니다. 행운을 빕니다!</p>
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
  onPrint: (sets: GeneratedNumbers[], roundTag: string) => void;
}

function RoundFolder({ roundTag, savedList, roundMap, defaultOpen, onDelete, onPrint }: RoundFolderProps) {
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
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        {open
          ? <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />
          : <Folder className="w-5 h-5 text-amber-400 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{roundTag}</span>
            {hasResult ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">추첨 완료</span>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full">추첨 대기</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400">{savedList.length}개 조합 · {totalGames}게임</span>
            {hasResult && stats.checkedSets > 0 && (
              <div className="flex items-center gap-1.5">
                {RANK_SUMMARY.map((r) => {
                  const cnt = stats.ranks[r.key] ?? 0;
                  if (cnt === 0) return null;
                  return (
                    <span key={r.key} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.color}`}>
                      {r.label} {cnt}
                    </span>
                  );
                })}
                {RANK_SUMMARY.every((r) => (stats.ranks[r.key] ?? 0) === 0) && (
                  <span className="text-[10px] text-gray-300">낙첨</span>
                )}
              </div>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
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
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-amber-700">당첨번호</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6].map((n, i) => (
                  <LottoBall key={i} number={n} size="sm" />
                ))}
                <span className="text-amber-400 font-bold text-sm mx-0.5">+</span>
                <LottoBall number={round.bnusNo} size="sm" />
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
                const meta = MODE_META[saved.mode];
                const ModeIcon = meta.icon;
                return (
                  <div key={saved.id} className="px-4 py-3">
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          <ModeIcon className="w-3 h-3" />
                          {meta.label}
                        </span>
                        {saved.subLabel && (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} opacity-70`}>
                            {saved.subLabel}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{formatDate(saved.savedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const printSets: GeneratedNumbers[] = saved.sets.map((s) => ({ numbers: s.numbers, mode: saved.mode }));
                            onPrint(printSets, saved.roundTag);
                          }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(saved.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Number sets */}
                    <div className="space-y-2.5">
                      {saved.sets.map((s, idx) => {
                        const result = round ? checkWinResult(s.numbers, round) : null;
                        return (
                          <div key={idx} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-300 w-5 text-right shrink-0">{idx + 1}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {s.numbers.map((n, i) => {
                                const isMatch = winningSet ? winningSet.has(n) : false;
                                return (
                                  <div key={i} className={`rounded-full transition-all ${isMatch ? "ring-2 ring-offset-1 ring-yellow-400" : ""}`}>
                                    <LottoBall number={n} size="sm" />
                                  </div>
                                );
                              })}
                            </div>
                            {result ? (
                              <WinBadge result={result} />
                            ) : !round ? (
                              <span className="text-[10px] text-gray-300 ml-auto">결과 대기 중</span>
                            ) : null}
                            <span className="text-xs text-gray-300 ml-auto">합: {s.numbers.reduce((a, b) => a + b, 0)}</span>
                          </div>
                        );
                      })}
                    </div>
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
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const { allRounds } = useLottoContext();

  const [showPrintPreview, setShowPrintPreview] = useState<{ sets: GeneratedNumbers[]; roundTag: string } | null>(null);
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
    loadSavedSets().then(setSets).finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    await deleteNumberSet(id);
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setSets([]);
    setConfirmClear(false);
    await clearAllSavedSets();
  }, [confirmClear]);

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
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-8">
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-amber-500" />
          나의 번호
        </h2>
        {sets.length > 0 && (
          <div className="flex items-center gap-2">
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
          <p className="text-sm font-medium text-gray-400">저장된 번호가 없습니다</p>
          <p className="text-xs text-gray-300 mt-1">번호 생성 후 저장하기 버튼을 눌러보세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall stats */}
          <StatsSummaryCard stats={overallStats} />

          {/* Summary bar */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              {groupedByRound.length}개 회차 · 총 {totalGames}게임
            </p>
            <CalendarDays className="w-3.5 h-3.5 text-gray-300" />
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
                  onPrint={(sets, rt) => setShowPrintPreview({ sets, roundTag: rt })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showPrintPreview && (
        <PrintPreview
          sets={showPrintPreview.sets.map(s => s.numbers)}
          onClose={() => setShowPrintPreview(null)}
          onPrint={(cal: PrintCalibration) => {
            setShowPrintPreview(null);
            printLottoNumbers(showPrintPreview.sets, showPrintPreview.roundTag, cal);
          }}
        />
      )}
    </div>
  );
}
