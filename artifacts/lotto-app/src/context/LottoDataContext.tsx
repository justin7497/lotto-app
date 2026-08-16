import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LottoRound } from "@/data/types";
import baseData from "@/data/lottoData.json";
import {
  fetchMissingRounds,
  fetchNewestPublishedRound,
  fetchRemoteLatestDrwNo,
  getCachedLatestDrwNo,
  isKoreaSaturdayDrawWindow,
  loadCachedRounds,
  saveCachedRounds,
} from "@/utils/lottoApi";
import { fetchLottoSyncFromFirestore } from "@/utils/lottoSyncFirestore";

const BASE_ROUNDS = baseData as LottoRound[];
const BASE_MAX = Math.max(...BASE_ROUNDS.map((r) => r.drwNo));

export type DataStatus = "loading" | "ready" | "error";

interface LottoDataContextValue {
  allRounds: LottoRound[];
  latestRound: LottoRound | null;
  status: DataStatus;
  updateMsg: string;
  updateFailed: boolean;
}

const LottoDataContext = createContext<LottoDataContextValue | null>(null);

function mergeCachedRounds(cached: LottoRound[], newRounds: LottoRound[]): LottoRound[] {
  return [...cached, ...newRounds].filter(
    (r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i,
  );
}

function maxDrwNo(rounds: LottoRound[], floor = 0): number {
  if (rounds.length === 0) return floor;
  return Math.max(floor, ...rounds.map((r) => r.drwNo));
}

export function LottoDataProvider({ children }: { children: ReactNode }) {
  const [extraRounds, setExtraRounds] = useState<LottoRound[]>(() => loadCachedRounds());
  const [status, setStatus] = useState<DataStatus>("loading");
  const [updateMsg, setUpdateMsg] = useState<string>("");
  const [updateFailed, setUpdateFailed] = useState(false);

  const syncLatestRounds = useCallback(async () => {
    const cached = loadCachedRounds();
    const cachedMax = getCachedLatestDrwNo();
    const knownMax = Math.max(BASE_MAX, cachedMax, maxDrwNo(cached, BASE_MAX));

    // 1) 동행복권 API에 다음 회차가 올랐는지 즉시 확인 (Hosting 재배포 불필요)
    const apiNewest = await fetchNewestPublishedRound(knownMax);

    // 2) Functions가 올려 둔 Firestore sync
    const firestoreSync = await fetchLottoSyncFromFirestore();
    const firestoreRounds =
      firestoreSync && firestoreSync.latestDrwNo > BASE_MAX
        ? firestoreSync.rounds.filter((r) => r.drwNo > BASE_MAX)
        : [];

    // 3) 빈 구간 채우기
    const startFrom = Math.max(BASE_MAX + 1, cachedMax + 1);
    const gapRounds = await fetchMissingRounds(startFrom, startFrom + 200);

    const incoming = [
      ...(apiNewest ? [apiNewest] : []),
      ...firestoreRounds,
      ...gapRounds,
    ].filter((r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i);

    const merged = mergeCachedRounds(cached, incoming);

    if (incoming.length > 0) {
      setExtraRounds(merged);
      saveCachedRounds(merged);
    }

    const localMax = Math.max(BASE_MAX, cachedMax, maxDrwNo(merged, BASE_MAX));
    const remoteLatest =
      (await fetchRemoteLatestDrwNo()) ??
      firestoreSync?.latestDrwNo ??
      apiNewest?.drwNo ??
      null;

    if (remoteLatest !== null && remoteLatest > localMax) {
      setUpdateFailed(true);
      setUpdateMsg(
        `최신 회차(제${remoteLatest}회) 반영이 지연되고 있습니다. 잠시 후 다시 열어 주세요.`,
      );
      return;
    }

    if (incoming.length > 0) {
      const latestNo = Math.max(...incoming.map((r) => r.drwNo));
      setUpdateFailed(false);
      setUpdateMsg(`${latestNo}회차까지 업데이트됨`);
      return;
    }

    setUpdateFailed(false);
    setUpdateMsg("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;

    async function load() {
      try {
        await syncLatestRounds();
      } catch {
        if (cancelled) return;
        setUpdateFailed(true);
        setUpdateMsg("네트워크 오류: 저장된 데이터를 사용합니다");
      } finally {
        if (!cancelled) setStatus("ready");
      }
    }

    void load();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    // 토요 추첨 직후: API 오픈 즉시 반영되도록 짧은 폴링
    const armDrawPoll = () => {
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (!isKoreaSaturdayDrawWindow()) return;
      pollTimer = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (!isKoreaSaturdayDrawWindow()) {
          if (pollTimer != null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
          return;
        }
        void load();
      }, 45_000);
    };
    armDrawPoll();
    const armTimer = window.setInterval(armDrawPoll, 5 * 60_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (pollTimer != null) window.clearInterval(pollTimer);
      window.clearInterval(armTimer);
    };
  }, [syncLatestRounds]);

  const allRounds = useMemo(() => {
    const combined = [...BASE_ROUNDS, ...extraRounds];
    return combined
      .filter((r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i)
      .sort((a, b) => a.drwNo - b.drwNo);
  }, [extraRounds]);

  const latestRound = useMemo(
    () => allRounds[allRounds.length - 1] ?? null,
    [allRounds],
  );

  return (
    <LottoDataContext.Provider
      value={{
        allRounds,
        latestRound,
        status,
        updateMsg,
        updateFailed,
      }}
    >
      {children}
    </LottoDataContext.Provider>
  );
}

export function useLottoContext(): LottoDataContextValue {
  const ctx = useContext(LottoDataContext);
  if (!ctx) {
    throw new Error("useLottoContext must be used within LottoDataProvider");
  }
  return ctx;
}
