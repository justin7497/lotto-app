/** 상단 뒤로가기·폰 뒤로가기가 공통으로 쓰는 fallback 경로 */
export function resolveBackFallback(pathname: string, search = ""): string {
  if (pathname === "/sign-in" || pathname === "/reset-password") return "/";
  if (pathname === "/sign-up") return "/sign-in";
  if (pathname === "/slip/load-numbers") {
    const tab = new URLSearchParams(search).get("tab") === "fixed" ? "fixed" : "regular";
    return `/slip?tab=${tab}`;
  }
  if (pathname === "/slip/load-fixed") return "/slip?tab=fixed";
  if (pathname === "/slip/add-fixed") return "/slip?tab=fixed";
  if (pathname.startsWith("/ball-draw/")) return "/ball-draw";
  return "/";
}
