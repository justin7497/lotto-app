import { schedulePrintDoneCloudSave } from "@/utils/printDoneCloud";

const STORAGE_KEY = "lotto_saved_print_done_v1";

const invalidateListeners = new Set<() => void>();

/** 저장된 5게임 세트 ID */
export function printDoneKey(setId: string): string {
  return setId;
}

export function onPrintDoneInvalidate(listener: () => void): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}

export function notifyPrintDoneInvalidate(): void {
  for (const listener of invalidateListeners) listener();
}

export function loadPrintDoneKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const rows = JSON.parse(raw) as unknown;
    if (!Array.isArray(rows)) return new Set();
    return new Set(
      rows
        .map((k) => {
          if (typeof k !== "string") return null;
          const colon = k.indexOf(":");
          return colon >= 0 ? k.slice(0, colon) : k;
        })
        .filter((k): k is string => Boolean(k)),
    );
  } catch {
    return new Set();
  }
}

export function savePrintDoneKeys(keys: ReadonlySet<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  notifyPrintDoneInvalidate();
  schedulePrintDoneCloudSave();
}

export function markPrintDoneKey(setId: string): void {
  const keys = loadPrintDoneKeys();
  const key = printDoneKey(setId);
  if (keys.has(key)) return;
  savePrintDoneKeys(new Set([...keys, key]));
}

export function removePrintDoneKeysForSet(keys: ReadonlySet<string>, setId: string): Set<string> {
  return new Set([...keys].filter((k) => k !== setId));
}
