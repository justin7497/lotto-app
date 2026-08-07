import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOverlayBack } from "@/hooks/useOverlayBack";

interface DeleteConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  title = "삭제 확인",
  message,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  tone = "danger",
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const closeDialog = useOverlayBack(open, onCancel);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  const confirmBtnClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-ink text-white hover:bg-ink-hover";

  const portalRoot = document.getElementById("app-frame") ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-5"
      role="dialog"
      aria-modal
      aria-labelledby="delete-confirm-title"
      onClick={closeDialog}
    >
      <div
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-confirm-title" className="text-xl font-extrabold text-gray-900 text-center mb-3">
          {title}
        </h3>
        <p className="text-base text-gray-700 text-center leading-relaxed mb-6">{message}</p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className={`w-full rounded-xl text-lg font-bold py-4 disabled:opacity-50 ${confirmBtnClass}`}
          >
            {loading ? "처리 중…" : confirmLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={closeDialog}
            className="relative z-10 w-full rounded-xl border-2 border-gray-300 bg-white text-gray-800 text-lg font-bold py-4 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}

interface ConfirmActionButtonProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral" | "light";
  size?: "default" | "compact" | "mini";
  className?: string;
  disabled?: boolean;
}

const toneClasses: Record<NonNullable<ConfirmActionButtonProps["tone"]>, string> = {
  danger:
    "border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200",
  neutral:
    "border-2 border-gray-300 bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100",
  light:
    "border border-white/70 bg-white/95 text-gray-800 hover:bg-white active:bg-gray-50",
};

const sizeClasses: Record<NonNullable<ConfirmActionButtonProps["size"]>, string> = {
  default: "px-3.5 py-2.5 text-base",
  compact: "px-2.5 py-1.5 text-sm",
  mini: "px-1.5 py-1 text-xs rounded-lg",
};

export function ConfirmActionButton({
  label,
  onConfirm,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  tone = "danger",
  size = "default",
  className = "",
  disabled = false,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`shrink-0 rounded-xl font-bold transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
      >
        {label}
      </button>
      <DeleteConfirmDialog
        open={open}
        title={confirmTitle ?? `${label} 확인`}
        message={confirmMessage ?? `${label}할까요?`}
        confirmLabel={confirmLabel ?? label}
        tone={tone === "light" ? "neutral" : tone}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}

interface DeleteActionButtonProps {
  onConfirm: () => void | Promise<void>;
  confirmTitle?: string;
  confirmMessage?: string;
  className?: string;
  size?: "default" | "compact" | "mini";
}

export function DeleteActionButton({
  onConfirm,
  confirmTitle = "삭제 확인",
  confirmMessage = "이 번호를 삭제할까요?",
  className = "",
  size = "mini",
}: DeleteActionButtonProps) {
  return (
    <ConfirmActionButton
      label="삭제"
      tone="danger"
      size={size}
      confirmTitle={confirmTitle}
      confirmMessage={confirmMessage}
      confirmLabel="삭제"
      onConfirm={onConfirm}
      className={className}
    />
  );
}

interface DeleteIconButtonProps {
  onConfirm: () => void | Promise<void>;
  confirmTitle?: string;
  confirmMessage?: string;
  className?: string;
}

export function DeleteIconButton({
  onConfirm,
  confirmTitle = "삭제 확인",
  confirmMessage = "이 번호를 삭제할까요?",
  className = "",
}: DeleteIconButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="삭제"
        onClick={() => setOpen(true)}
        className={`shrink-0 w-6 h-6 rounded-md border border-red-200 bg-red-50 text-red-600 flex items-center justify-center active:scale-95 touch-manipulation ${className}`}
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
      <DeleteConfirmDialog
        open={open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="삭제"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}
