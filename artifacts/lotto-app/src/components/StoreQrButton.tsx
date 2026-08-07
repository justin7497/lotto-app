import { QrCode } from "lucide-react";

interface StoreQrButtonProps {
  onClick: () => void;
  label?: string;
  subLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: "lg" | "md";
}

export default function StoreQrButton({
  onClick,
  label = "판매점 스캐너에 인식 요청해 주세요",
  subLabel,
  disabled = false,
  className = "",
  size = "lg",
}: StoreQrButtonProps) {
  const isLg = size === "lg";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`store-qr-btn ${isLg ? "py-4 px-5 text-lg" : "py-3.5 px-4 text-base"} ${className}`}
    >
      <span className="flex items-center justify-center gap-2.5">
        <QrCode className={isLg ? "w-7 h-7" : "w-6 h-6"} strokeWidth={2.25} />
        {label}
      </span>
      {subLabel && (
        <span
          className={`block mt-1.5 font-medium text-white/90 ${
            isLg ? "text-sm" : "text-xs"
          }`}
        >
          {subLabel}
        </span>
      )}
    </button>
  );
}
