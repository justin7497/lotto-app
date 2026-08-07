import { useState } from "react";
import { X } from "lucide-react";

interface AccountDeleteDialogProps {
  open: boolean;
  email: string;
  onCancel: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export default function AccountDeleteDialog({
  open,
  email,
  onCancel,
  onConfirm,
}: AccountDeleteDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "탈퇴에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setPassword("");
    setError(null);
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5"
      role="dialog"
      aria-modal
      aria-labelledby="account-delete-title"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 id="account-delete-title" className="text-xl font-extrabold text-gray-900">
            회원 탈퇴
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-base text-gray-700 leading-relaxed mb-4">
          <strong>{email}</strong> 계정을 삭제합니다. 클라우드에 백업된 저장 번호·알림 설정이
          모두 삭제되며 복구할 수 없습니다.
        </p>

        <label className="block mb-4">
          <span className="text-sm font-semibold text-gray-700 mb-1.5 block">비밀번호 확인</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-base text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            placeholder="비밀번호 입력"
          />
        </label>

        {error ? <p className="text-sm text-red-600 mb-3 text-center">{error}</p> : null}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "처리 중…" : "탈퇴하기"}
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
