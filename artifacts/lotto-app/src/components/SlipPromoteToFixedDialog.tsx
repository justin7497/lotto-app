import { createPortal } from "react-dom";
import SlipBallRow from "@/components/SlipBallRow";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import type { SlipGame } from "@/utils/slipDraft";

const SLOT_LABELS = ["A", "B", "C", "D", "E"] as const;

export default function SlipPromoteToFixedDialog({
  open,
  games,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  games: SlipGame[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const closeDialog = useOverlayBack(open, onCancel);
  if (!open) return null;

  const portalRoot = document.getElementById("app-frame") ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:px-5"
      role="dialog"
      aria-modal
      aria-labelledby="slip-promote-title"
      onClick={closeDialog}
    >
      <div
        className="slip-promote-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="slip-promote-title" className="slip-promote-dialog__title">
          고정번호로 이동
        </h3>
        <p className="slip-promote-dialog__desc">
          아래 {games.length}게임을 고정번호로 보관합니다.
          <br />
          일반번호 슬립지는 그대로 유지됩니다.
        </p>

        <ul className="slip-promote-dialog__list">
          {games.map((game, index) => (
            <li key={game.id} className="slip-promote-dialog__item">
              <SlipBallRow
                game={game}
                slotLabel={SLOT_LABELS[index % SLOT_LABELS.length]}
              />
            </li>
          ))}
        </ul>

        <div className="slip-promote-dialog__actions">
          <button
            type="button"
            onClick={onConfirm}
            className="slip-promote-dialog__confirm"
          >
            고정번호로 보관
          </button>
          <button
            type="button"
            onClick={closeDialog}
            className="slip-promote-dialog__cancel"
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
