import { useCallback } from "react";
import { useLocation } from "wouter";

/** 브라우저 히스토리가 있으면 한 단계 뒤로, 없으면 fallback(기본 홈)으로 이동 */
export function useGoBack(fallback = "/") {
  const [, setLocation] = useLocation();

  return useCallback(() => {
    if (typeof window === "undefined") {
      setLocation(fallback);
      return;
    }

    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      window.history.back();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    setLocation(fallback);
  }, [setLocation, fallback]);
}
