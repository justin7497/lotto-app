import { Heart, X } from "lucide-react";
import { DeleteActionButton, ConfirmActionButton } from "@/components/DeleteConfirmDialog";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import type { MyWish } from "@/utils/myWishStorage";
import { AFFIRMATION_CONTENT_NOTICE } from "@/data/affirmationNotice";

function formatWishDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function MyWishListSheet({
  open,
  wishes,
  onClose,
  onDelete,
  onClearAll,
}: {
  open: boolean;
  wishes: MyWish[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}) {
  const closeSheet = useOverlayBack(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
      onClick={closeSheet}
      role="presentation"
    >
      <div
        className="home-category-sheet my-wish-list-sheet w-full max-h-[78dvh]"
        role="dialog"
        aria-modal
        aria-labelledby="my-wish-list-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="home-category-sheet__header">
          <h2 id="my-wish-list-sheet-title" className="home-category-sheet__title">
            <span className="inline-flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#127a6e]" aria-hidden />
              나의 확언
            </span>
          </h2>
          <button
            type="button"
            onClick={closeSheet}
            className="home-category-sheet__close"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="home-category-sheet__body my-wish-list-sheet__body">
          {wishes.length === 0 ? (
            <p className="my-wish-list-sheet__empty">아직 저장한 확언이 없습니다.</p>
          ) : (
            <>
              <div className="my-wish-list-sheet__toolbar">
                <span className="my-wish-list-sheet__count">총 {wishes.length}개</span>
                <ConfirmActionButton
                  label="전체 삭제"
                  tone="danger"
                  className="!px-2.5 !py-1.5 !text-sm"
                  confirmTitle="확언 전체 삭제"
                  confirmMessage="저장한 확언을 모두 삭제할까요? 되돌릴 수 없습니다."
                  confirmLabel="전체 삭제"
                  onConfirm={onClearAll}
                />
              </div>
              <ul className="my-wish-list-sheet__list">
                {wishes.map((wish) => (
                  <li key={wish.id} className="my-wish-list-sheet__item">
                    <div className="my-wish-list-sheet__item-body">
                      {wish.title ? (
                        <p className="my-wish-list-sheet__title">{wish.title}</p>
                      ) : null}
                      <p className="my-wish-list-sheet__text">{wish.text}</p>
                      <p className="my-wish-list-sheet__date">{formatWishDate(wish.createdAt)}</p>
                    </div>
                    <DeleteActionButton
                      size="mini"
                      className="shrink-0"
                      confirmTitle="확언 삭제"
                      confirmMessage="이 확언을 삭제할까요?"
                      onConfirm={() => onDelete(wish.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="my-wish-list-sheet__notice">{AFFIRMATION_CONTENT_NOTICE}</p>
        </div>
      </div>
    </div>
  );
}
