import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ensureAuthTokenReady, getAuthUserId } from "@/utils/authReady";
import {
  loadPrintDoneKeys,
  notifyPrintDoneInvalidate,
  savePrintDoneKeys,
} from "@/utils/printDone";

const PRINT_DONE_DOC_ID = "printDone";

function printDoneRef(uid: string) {
  if (!db) throw new Error("Firestore is not configured");
  return doc(db, "users", uid, "settings", PRINT_DONE_DOC_ID);
}

function normalizeKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === "string" && k.length > 0);
}

export async function loadPrintDoneKeysFromCloud(uid: string): Promise<Set<string>> {
  if (!isFirebaseConfigured || !db) return new Set();
  if (!(await ensureAuthTokenReady())) return new Set();
  try {
    const snap = await getDoc(printDoneRef(uid));
    if (!snap.exists()) return new Set();
    const data = snap.data();
    return new Set(normalizeKeys(data?.keys));
  } catch {
    return new Set();
  }
}

export async function savePrintDoneKeysToCloud(
  uid: string,
  keys: ReadonlySet<string>,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  if (!(await ensureAuthTokenReady())) return;
  try {
    await setDoc(printDoneRef(uid), {
      keys: [...keys],
      updatedAt: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}

/** 로컬·클라우드 출력완료 키 병합 후 localStorage에 반영 */
export async function syncPrintDoneFromCloud(): Promise<number> {
  const uid = getAuthUserId();
  if (!uid || !isFirebaseConfigured) return 0;

  const local = loadPrintDoneKeys();
  const remote = await loadPrintDoneKeysFromCloud(uid);
  if (remote.size === 0 && local.size === 0) return 0;

  const merged = new Set([...local, ...remote]);
  const added = merged.size - local.size;
  savePrintDoneKeys(merged);

  if (local.size > 0 || merged.size > 0) {
    await savePrintDoneKeysToCloud(uid, merged);
  }

  notifyPrintDoneInvalidate();
  return added;
}

export function schedulePrintDoneCloudSave(): void {
  const uid = getAuthUserId();
  if (!uid || !isFirebaseConfigured) return;
  void savePrintDoneKeysToCloud(uid, loadPrintDoneKeys());
}
