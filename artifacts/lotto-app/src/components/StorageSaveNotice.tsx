import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";

type Variant = "extracted" | "myPicks";

interface StorageSaveNoticeProps {
  variant?: Variant;
  className?: string;
}

const boxClass =
  "rounded-xl border px-3.5 py-2.5 text-base leading-relaxed";

export default function StorageSaveNotice({
  variant = "extracted",
  className = "",
}: StorageSaveNoticeProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (variant === "myPicks") {
    return (
      <p className={`${boxClass} text-gray-600 bg-gray-50 border-gray-100 ${className}`}>
        내 번호는 <strong className="text-gray-800">이 휴대폰</strong>에만 저장됩니다.
        브라우저·앱 데이터를 지우면 함께 사라질 수 있습니다.
      </p>
    );
  }

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <p className={`${boxClass} text-emerald-800 bg-emerald-50 border-emerald-100 ${className}`}>
        로그인되어 있습니다. 추출번호는 <strong>계정에 백업</strong>되며,
        이 기기와 다른 기기에서도 불러올 수 있습니다.
      </p>
    );
  }

  return (
    <p className={`${boxClass} text-amber-800 bg-amber-50 border-amber-100 ${className}`}>
      추출번호는 <strong>이 휴대폰</strong>에 저장됩니다.{" "}
      <Link href="/sign-in" className="font-semibold underline underline-offset-2 hover:text-amber-900">
        로그인
      </Link>
      하면 다른 기기에서도 불러올 수 있습니다.
    </p>
  );
}
