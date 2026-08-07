/** 저장·슬립 게임 목록 — 구분(수동/자동/반자동) + 선택 번호 */
export default function SavedGamesListHeader() {
  return (
    <div
      className="flex items-center gap-2 px-2 pb-1 text-xs font-semibold text-gray-500"
      aria-hidden
    >
      <span className="w-5 shrink-0" aria-hidden />
      <span className="shrink-0">구분</span>
      <span className="flex-1 min-w-0">선택 번호</span>
    </div>
  );
}
