import { useCallback, useEffect, useRef } from "react";
import { dismissOverlayBack, registerOverlayBack } from "@/utils/overlayBackStack";

/**
 * 팝업·시트가 열려 있을 때 폰 백키/스와이프 뒤로가기로 닫히게 합니다.
 * 반환된 close()를 닫기 버튼에 연결하세요.
 */
export function useOverlayBack(open: boolean, onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    return registerOverlayBack(() => onCloseRef.current());
  }, [open]);

  return useCallback(() => {
    if (dismissOverlayBack()) return;
    onCloseRef.current();
  }, []);
}
