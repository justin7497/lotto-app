import { useState } from "react";
import { Camera } from "lucide-react";
import { queryCameraPermission } from "@/utils/cameraPermission";

interface CameraPermissionPrimerProps {
  title?: string;
  description?: string;
  onStart: () => void | Promise<void>;
}

export async function resolveCameraPermission() {
  return queryCameraPermission();
}

export function CameraPermissionPrimer({
  title = "카메라 권한이 필요합니다",
  description = "QR 코드를 스캔하려면 카메라 접근을 허용해 주세요. 버튼을 누르면 시스템 확인 창이 나타납니다.",
  onStart,
}: CameraPermissionPrimerProps) {
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    setDenied(false);
    try {
      await onStart();
    } catch {
      setDenied(true);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="camera-permission-primer">
      <div className="camera-permission-primer__icon" aria-hidden>
        <Camera className="w-10 h-10" strokeWidth={2} />
      </div>
      <p className="camera-permission-primer__title">{title}</p>
      <p className="camera-permission-primer__desc">{description}</p>
      {denied ? (
        <p className="camera-permission-primer__error">
          카메라를 사용할 수 없습니다. 휴대폰 설정 → 앱 → 소원로또 → 권한에서 카메라를 허용해 주세요.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleAllow()}
        disabled={requesting}
        className="camera-permission-primer__btn"
      >
        {requesting ? "카메라 여는 중…" : "카메라 허용하고 스캔하기"}
      </button>
    </div>
  );
}
