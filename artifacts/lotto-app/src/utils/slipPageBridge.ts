/** 모바일 슬립지 — SubPageHeader ↔ Slip 페이지 동기화 */

export type SlipPageView = "empty" | "qr" | "manage";
export type SlipHeaderAction = "open-editor" | "open-qr";

export type SlipHeaderState = {
  view: SlipPageView;
  hasGames: boolean;
  canAddGame: boolean;
};

const ACTION_EVENT = "slip-header-action";

let currentState: SlipHeaderState = {
  view: "empty",
  hasGames: false,
  canAddGame: true,
};

const stateListeners = new Set<(state: SlipHeaderState) => void>();

export function publishSlipHeaderState(state: SlipHeaderState): void {
  currentState = state;
  for (const listener of stateListeners) listener(state);
}

export function subscribeSlipHeaderState(listener: (state: SlipHeaderState) => void): () => void {
  listener(currentState);
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export function dispatchSlipHeaderAction(action: SlipHeaderAction): void {
  window.dispatchEvent(new CustomEvent<SlipHeaderAction>(ACTION_EVENT, { detail: action }));
}

export function subscribeSlipHeaderAction(
  handler: (action: SlipHeaderAction) => void,
): () => void {
  const onAction = (event: Event) => {
    handler((event as CustomEvent<SlipHeaderAction>).detail);
  };
  window.addEventListener(ACTION_EVENT, onAction);
  return () => window.removeEventListener(ACTION_EVENT, onAction);
}

export function resetSlipHeaderState(): void {
  publishSlipHeaderState({ view: "empty", hasGames: false, canAddGame: true });
}
