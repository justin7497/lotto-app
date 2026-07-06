import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Pencil, Plus, Trash2, X } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import LottoPickButton from "@/components/LottoPickButton";
import MobileSlipQr from "@/components/MobileSlipQr";
import StorageSaveNotice from "@/components/StorageSaveNotice";
import StoreQrButton from "@/components/StoreQrButton";
import {
  deleteFavoritePick,
  loadFavoritePicks,
  saveFavoritePick,
  updateFavoritePick,
  type FavoritePick,
} from "@/utils/favoriteNumbers";

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

function emptySelection(): Set<number> {
  return new Set();
}

export default function MyPicks() {
  const [picks, setPicks] = useState<FavoritePick[]>(() => loadFavoritePicks());
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(emptySelection);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrPick, setQrPick] = useState<FavoritePick | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedList = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);

  const refresh = useCallback(() => {
    setPicks(loadFavoritePicks());
  }, []);

  function toggleNumber(n: number) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
        return next;
      }
      if (next.size >= 6) {
        setError("번호는 6개까지만 고를 수 있어요.");
        return prev;
      }
      next.add(n);
      return next;
    });
  }

  function resetForm() {
    setName("");
    setSelected(emptySelection());
    setEditingId(null);
    setError(null);
  }

  function handleSave() {
    setError(null);
    setMessage(null);
    if (selectedList.length !== 6) {
      setError("번호 6개를 모두 선택해 주세요.");
      return;
    }

    if (editingId) {
      const ok = updateFavoritePick(editingId, name, selectedList);
      if (!ok) {
        setError("수정에 실패했습니다. 번호를 다시 확인해 주세요.");
        return;
      }
      setMessage("내 번호가 수정됐어요.");
    } else {
      const saved = saveFavoritePick(name, selectedList);
      if (!saved) {
        setError("저장에 실패했습니다. 같은 번호가 이미 있거나 입력이 올바르지 않아요.");
        return;
      }
      setMessage("내 번호가 저장됐어요.");
    }

    resetForm();
    refresh();
  }

  function startEdit(pick: FavoritePick) {
    setEditingId(pick.id);
    setName(pick.name);
    setSelected(new Set(pick.numbers));
    setError(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    deleteFavoritePick(id);
    if (editingId === id) resetForm();
    setConfirmDeleteId(null);
    refresh();
    setMessage("삭제했습니다.");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500" />
          내 번호
        </h2>
        <p className="text-base text-gray-600 mt-1.5 leading-relaxed">
          매주 쓰는 나만의 번호를 직접 입력해 저장합니다.
        </p>
        <StorageSaveNotice variant="myPicks" className="mt-3" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <label className="block text-base font-semibold text-gray-800 mb-2">
          이름 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 생일 조합, 우리 가족"
          className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3.5 text-base text-gray-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 mb-4"
        />

        <p className="text-base font-semibold text-gray-800 mb-2">
          번호 선택 <span className="text-amber-600">{selectedList.length}/6</span>
        </p>
        <div className="grid grid-cols-9 sm:grid-cols-9 gap-2 mb-4">
          {ALL_NUMBERS.map((n) => (
            <LottoPickButton
              key={n}
              number={n}
              selected={selected.has(n)}
              onClick={() => toggleNumber(n)}
            />
          ))}
        </div>

        {selectedList.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {selectedList.map((n) => (
              <LottoBall key={n} number={n} size="md" />
            ))}
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-red-600 mb-3"
            >
              {error}
            </motion.p>
          )}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-emerald-600 mb-3"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-md"
          >
            <Plus className="w-4 h-4" />
            {editingId ? "수정 저장" : "저장하기"}
          </button>
          {(editingId || selected.size > 0 || name) && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <p className="text-base text-gray-500 mb-3 leading-relaxed">
        · 번호는 1~45, 겹치지 않게 6개를 고릅니다.
        <br />
        · 「추출」에는 추천·로또킹·사주에서 저장한 세트가 모입니다.
      </p>

      {picks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">아직 내 번호가 없어요.</p>
          <p className="text-xs text-gray-300 mt-1">위에서 번호를 입력해 보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {picks.map((pick) => (
            <div key={pick.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="font-semibold text-gray-800">{pick.name}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(pick)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                    title="수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pick.id)}
                    onBlur={() => setConfirmDeleteId(null)}
                    className={`p-2 rounded-lg transition-colors ${
                      confirmDeleteId === pick.id
                        ? "bg-red-50 text-red-600"
                        : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                    }`}
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {pick.numbers.map((n) => (
                  <LottoBall key={n} number={n} size="md" />
                ))}
              </div>
              <StoreQrButton size="md" onClick={() => setQrPick(pick)} />
            </div>
          ))}
        </div>
      )}

      <MobileSlipQr
        numberSets={qrPick ? [qrPick.numbers] : []}
        open={qrPick !== null}
        onClose={() => setQrPick(null)}
        title={qrPick ? `${qrPick.name}` : "번호 QR"}
      />
    </div>
  );
}
