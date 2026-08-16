/** 빌드·미리보기 패널 — 모든 주요 화면 링크 */
export interface PreviewRoute {
  path: string;
  label: string;
  group: string;
}

export const PREVIEW_ROUTES: PreviewRoute[] = [
  { path: "/", label: "홈", group: "메인" },
  { path: "/slip?qr=1&tab=regular", label: "모바일 슬립 (QR)", group: "슬립" },
  { path: "/slip", label: "모바일 슬립지", group: "슬립" },
  { path: "/slip/load-numbers", label: "번호 불러오기", group: "슬립" },
  { path: "/slip/add-fixed", label: "고정번호", group: "슬립" },
  { path: "/lottoking", label: "행운 · 패턴번호", group: "번호 만들기" },
  { path: "/saju", label: "사주 · 행운번호", group: "번호 만들기" },
  { path: "/generator", label: "스마트 · 8추천", group: "번호 만들기" },
  { path: "/saved-numbers", label: "나의 로또번호", group: "내 번호" },
  { path: "/win-notifications", label: "로또 전광판", group: "당첨" },
  { path: "/winning-numbers", label: "당첨번호 & 당첨금", group: "당첨" },
  { path: "/notification-settings", label: "알림 설정", group: "설정" },
  { path: "/home-theme", label: "화면 테마", group: "설정" },
  { path: "/number-stats", label: "번호 통계", group: "정보" },
  { path: "/net-prize", label: "실수령액 계산기", group: "정보" },
  { path: "/ball-draw", label: "추첨 뽑기", group: "추첨" },
  { path: "/ball-draw/machine", label: "공뽑기", group: "추첨" },
  { path: "/ball-draw/roulette", label: "돌림판", group: "추첨" },
  { path: "/ball-draw/box", label: "행운상자", group: "추첨" },
  { path: "/ball-draw/plinko", label: "플링코", group: "추첨" },
  { path: "/my-wish", label: "나의 소원", group: "기타" },
  { path: "/bulk-ticket-import", label: "티켓 일괄 등록", group: "기타" },
  { path: "/privacy", label: "개인정보처리방침", group: "기타" },
  { path: "/dev/update-test", label: "업데이트 테스트", group: "개발" },
];

export const PREVIEW_ROUTE_GROUPS = [...new Set(PREVIEW_ROUTES.map((r) => r.group))];
