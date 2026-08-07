import { doc, getDoc } from "firebase/firestore";
import type { LottoRound } from "@/data/types";
import { db, isFirebaseConfigured } from "@/lib/firebase";

export interface LottoSyncPayload {
  updatedAt: string;
  latestDrwNo: number;
  rounds: LottoRound[];
}

export async function fetchLottoSyncFromFirestore(): Promise<LottoSyncPayload | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "appConfig", "lottoSync"));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<LottoSyncPayload>;
    if (!Array.isArray(data.rounds) || typeof data.latestDrwNo !== "number") return null;
    return {
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
      latestDrwNo: data.latestDrwNo,
      rounds: data.rounds,
    };
  } catch {
    return null;
  }
}
