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
  fetchRemoteLatestDrwNo,
  getCachedLatestDrwNo,
  loadCachedRounds,
  saveCachedRounds,
} from "@/utils/lottoApi";

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
    const startFrom = Math.max(BASE_MAX + 1, cachedMax + 1);

    const newRounds = await fetchMissingRounds(startFrom, startFrom + 200);
    const merged = newRounds.length > 0 ? mergeCachedRounds(cached, newRounds) : cached;

    if (newRounds.length > 0) {
      setExtraRounds(merged);
      saveCachedRounds(merged);
    }

    const localMax = Math.max(BASE_MAX, cachedMax, maxDrwNo(merged, BASE_MAX));
    const remoteLatest = await fetchRemoteLatestDrwNo();

    if (remoteLatest !== null && remoteLatest > localMax) {
      setUpdateFailed(true);
      setUpdateMsg(
        `최신 회차(제${remoteLatest}회) 반영이 지연되고 있습니다. 잠시 후 다시 열어 주세요.`,
      );
      return;
    }

    if (newRounds.length > 0) {
      const latestNo = Math.max(...newRounds.map((r) => r.drwNo));
      setUpdateFailed(false);
      setUpdateMsg(`${latestNo}회차까지 업데이트됨`);
      return;
    }

    setUpdateFailed(false);
    setUpdateMsg("");
  }, []);

  useEffect(() => {
    let cancelled = false;

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

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
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
  if (!ctx) throw new Error("useLottoContext must be used within LottoDataProvider");
  return ctx;
}
