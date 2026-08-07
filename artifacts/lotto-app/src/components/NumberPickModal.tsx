import { PickCell } from "@/components/NumberPickBoard";
import { ConfirmActionButton } from "@/components/DeleteConfirmDialog";

const ALL_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1);

/** 고정수는 최소 1칸은 자동/수동으로 남김 */
export const MAX_FIXED_NUMBERS = 5;
export const MAX_EXCLUDED_NUMBERS = 39;

export type NumberPickModalKind = "fixed" | "exclude";

export default function NumberPickModal({
  kind,
  draft,
  blocked,
  maxCount,
  hint,
  variant = "default",
  onToggle,
  onReset,
  onConfirm,
  onClose,
}: {
  kind: NumberPickModalKind;
  draft: Set<number>;
  /** 상대 쪽에서 이미 쓴 번호 — 선택 불가 */
  blocked: Set<number>;
  maxCount: number;
  hint: string | null;
  variant?: "default" | "slip";
  onToggle: (n: number) => void;
  onReset: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const title = kind === "fixed" ? "고정수 선택" : "제외수 선택";
  const boardClass = variant === "slip" ? "pick-board pick-board--slip" : "pick-board";

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
          <div className={boardClass}>
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
                    variant={variant}
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
          {hint ? (
            <p className="text-sm text-red-600 mt-1 px-0.5" role="alert">
              {hint}
            </p>
          ) : null}
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
