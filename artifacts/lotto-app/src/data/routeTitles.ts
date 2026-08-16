/** 홈 메뉴 라벨과 동일 — 하위 페이지 상단 제목 */
export const ROUTE_TITLES: Record<string, string> = {
  "/slip": "모바일 슬립지",
  "/slip/load-numbers": "나의 로또 번호 불러오기",
  "/slip/load-fixed": "고정번호 불러오기",
  "/slip/add-fixed": "고정번호",
  "/my-wish": "나의 소원",
  "/saved-numbers": "나의 로또번호",
  "/winning-numbers": "당첨번호 & 당첨금",
  "/number-stats": "번호 통계",
  "/win-notifications": "로또 전광판",
  "/notification-settings": "알림 설정",
  "/bulk-ticket-import": "티켓 일괄 등록",
  "/net-prize": "실수령액 계산기",
  "/home-theme": "화면 테마",
  "/lottoking": "행운 · 패턴번호",
  "/saju": "사주 · 행운번호",
  "/generator": "스마트 · 8추천",
  "/ball-draw": "추첨 뽑기",
  "/ball-draw/machine": "추첨 · 공뽑기",
  "/ball-draw/roulette": "추첨 · 돌림판",
  "/ball-draw/box": "추첨 · 행운상자",
  "/ball-draw/plinko": "추첨 · 플링코",
  "/sign-in": "로그인",
  "/sign-up": "회원가입",
  "/reset-password": "비밀번호 재설정",
  "/privacy": "개인정보처리방침",
  "/character-preview": "대표 캐릭터 미리보기",
  "/dev/release": "빌드 · 화면 미리보기",
  "/admin": "관리자",
  "/admin/desktop": "관리자 (PC)",
};

const ROUTE_TITLE_VARIANTS: Record<string, Record<string, string>> = {};

export function titleForRoute(pathname: string, search = ""): string {
  const base = pathname.split("?")[0];
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (base === "/slip" && params.get("edit") === "1") {
    return "번호 직접 선택";
  }
  if (base === "/saved-numbers" && params.get("import") === "qr") {
    return "나의 로또번호";
  }
  const from = params.get("from");
  const variant = from ? ROUTE_TITLE_VARIANTS[base]?.[from] : undefined;
  if (variant) return variant;
  return ROUTE_TITLES[base] ?? "소원로또";
}
