import { getRoundTag } from "@/utils/savedNumbers";

export default function AutoSaveNotice({
  saved = false,
  isDuplicate = false,
  error = null,
  className = "",
}: {
  saved?: boolean;
  isDuplicate?: boolean;
  error?: string | null;
  className?: string;
}) {
  if (error) {
    return (
      <div
        className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ${className}`}
      >
        {error}
      </div>
    );
  }

  if (saved) {
    return (
      <div
        className={`rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 ${className}`}
      >
        {getRoundTag()} · 나의 로또번호에 저장됨
      </div>
    );
  }

  if (isDuplicate) {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 ${className}`}
      >
        이번 주에 이미 저장된 번호입니다
      </div>
    );
  }

  return null;
}
