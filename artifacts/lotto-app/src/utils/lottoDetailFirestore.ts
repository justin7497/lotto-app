import { doc, getDoc } from "firebase/firestore";
import type { LottoRoundDetail } from "@/data/types";
import { db, isFirebaseConfigured } from "@/lib/firebase";

export interface LottoDetailSyncPayload {
  updatedAt: string;
  latestDrwNo: number;
  rounds: Record<string, LottoRoundDetail>;
}

let detailSyncPromise: Promise<LottoDetailSyncPayload | null> | null = null;

export async function loadLottoDetailSyncFromFirestore(): Promise<LottoDetailSyncPayload | null> {
  if (!detailSyncPromise) {
    detailSyncPromise = (async () => {
      if (!isFirebaseConfigured || !db) return null;
      try {
        const snap = await getDoc(doc(db, "appConfig", "lottoDetailSync"));
        if (!snap.exists()) return null;
        const data = snap.data() as Partial<LottoDetailSyncPayload>;
        if (typeof data.latestDrwNo !== "number" || !data.rounds || typeof data.rounds !== "object") {
          return null;
        }
        return {
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
          latestDrwNo: data.latestDrwNo,
          rounds: data.rounds,
        };
      } catch {
        return null;
      }
    })();
  }
  return detailSyncPromise;
}

export async function fetchRoundDetailFromFirestore(drwNo: number): Promise<LottoRoundDetail | null> {
  const payload = await loadLottoDetailSyncFromFirestore();
  if (!payload) return null;
  const entry = payload.rounds[String(drwNo)];
  if (!entry || typeof entry.drwNo !== "number") return null;
  return entry;
}
