import { useCallback } from "react";
import { onBack } from "@/utils/nativeBackBridge";

/** 상단 이전 — 시스템 뒤로가기(SowonLottoWeb.onBack)와 동일 */
export function useGoBack() {
  return useCallback(() => {
    onBack();
  }, []);
}
