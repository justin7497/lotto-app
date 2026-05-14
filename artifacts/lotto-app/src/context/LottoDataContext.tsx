import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type { LottoRound } from "@/data/types";
import baseData from "@/data/lottoData.json";
import {
  fetchMissingRounds,
  loadCachedRounds,
  saveCachedRounds,
  getCachedLatestDrwNo,
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

export function LottoDataProvider({ children }: { children: ReactNode }) {
  const [extraRounds, setExtraRounds] = useState<LottoRound[]>(() => loadCachedRounds());
  const [status, setStatus] = useState<DataStatus>("loading");
  const [updateMsg, setUpdateMsg] = useState<string>("");
  const [updateFailed, setUpdateFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = loadCachedRounds();
      const cachedMax = getCachedLatestDrwNo();
      const startFrom = Math.max(BASE_MAX + 1, cachedMax + 1);

      try {
        const newRounds = await fetchMissingRounds(startFrom, startFrom + 200);
        if (cancelled) return;

        if (newRounds.length > 0) {
          const merged = [...cached, ...newRounds].filter(
            (r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i
          );
          setExtraRounds(merged);
          saveCachedRounds(merged);
          const latestNo = Math.max(...newRounds.map((r) => r.drwNo));
          setUpdateMsg(`${latestNo}회차까지 업데이트됨`);
          setUpdateFailed(false);
        } else {
          // 새 회차 없음 = 이미 최신 상태 (오류 아님)
          setUpdateFailed(false);
          setUpdateMsg("");
        }
      } catch {
        if (cancelled) return;
        setUpdateFailed(true);
        setUpdateMsg("네트워크 오류: 저장된 데이터를 사용합니다");
      } finally {
        if (!cancelled) setStatus("ready");
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const allRounds = useMemo(() => {
    const combined = [...BASE_ROUNDS, ...extraRounds];
    return combined
      .filter((r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i)
      .sort((a, b) => a.drwNo - b.drwNo);
  }, [extraRounds]);

  const latestRound = useMemo(
    () => allRounds[allRounds.length - 1] ?? null,
    [allRounds]
  );

  return (
    <LottoDataContext.Provider value={{ allRounds, latestRound, status, updateMsg, updateFailed }}>
      {children}
    </LottoDataContext.Provider>
  );
}

export function useLottoContext(): LottoDataContextValue {
  const ctx = useContext(LottoDataContext);
  if (!ctx) throw new Error("useLottoContext must be used within LottoDataProvider");
  return ctx;
}
