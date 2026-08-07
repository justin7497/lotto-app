export type SlipGameSourceId =
  | "king"
  | "saju"
  | "recommend"
  | "mypicks"
  | "manual"
  | "load";

export type SlipGameCategory = "regular" | "fixed";

export const SLIP_GAME_CATEGORY_LABELS: Record<SlipGameCategory, string> = {
  regular: "일반번호",
  fixed: "고정번호",
};

export const SLIP_SOURCE_LABELS: Record<SlipGameSourceId, string> = {
  king: "행운 · 패턴번호",
  saju: "사주 · 행운번호",
  recommend: "스마트 · 8추천",
  mypicks: "고정번호",
  manual: "직접 입력",
  load: "불러오기",
};

export function slipSourceLabel(
  source?: SlipGameSourceId,
  customLabel?: string,
): string | undefined {
  if (customLabel) return customLabel;
  if (!source) return undefined;
  return SLIP_SOURCE_LABELS[source];
}

export function newSlipBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slipSourceIdFromLoadSource(
  id: "king" | "saju" | "recommend" | "mypicks",
): SlipGameSourceId {
  return id;
}

/** 슬립지 게임 분류 — 추천·저장 번호는 일반번호, 고정번호만 별도 */
export function slipGameCategory(game: {
  source?: SlipGameSourceId;
  favoritePickId?: string;
}): SlipGameCategory {
  if (game.source === "mypicks" || game.favoritePickId) return "fixed";
  return "regular";
}

export function slipGameCategoryLabel(game: {
  source?: SlipGameSourceId;
  favoritePickId?: string;
}): string {
  return SLIP_GAME_CATEGORY_LABELS[slipGameCategory(game)];
}
