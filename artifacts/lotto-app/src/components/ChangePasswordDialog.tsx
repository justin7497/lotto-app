import { useState } from "react";
import { X } from "lucide-react";

interface ChangePasswordDialogProps {
  open: boolean;
  email: string;
  onCancel: () => void;
  onConfirm: (currentPassword: string, newPassword: string) => Promise<void>;
}

export default function ChangePasswordDialog({
  open,
  email,
  onCancel,
  onConfirm,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setError(null);
  }

  async function handleConfirm() {
    if (!currentPassword.trim()) {
      setError("현재 비밀번호를 입력해 주세요.");
      return;
    }
    if (newPassword.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(currentPassword, newPassword);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    resetForm();
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5"
      role="dialog"
      aria-modal
      aria-labelledby="change-password-title"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 id="change-password-title" className="text-xl font-extrabold text-gray-900">
            비밀번호 변경
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-base leading-relaxed text-gray-700">
          <strong>{email}</strong> 계정의 비밀번호를 변경합니다.
        </p>

        <div className="mb-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-base text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              placeholder="현재 비밀번호"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">새 비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-base text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              placeholder="6자 이상"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">새 비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-base text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              placeholder="새 비밀번호 다시 입력"
            />
          </label>
        </div>

        {error ? <p className="mb-3 text-center text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
          >
            {loading ? "변경 중…" : "비밀번호 변경"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="w-full rounded-xl border border-gray-200 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
