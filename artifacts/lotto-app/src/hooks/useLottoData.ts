import { useState, useEffect, useMemo } from "react";
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

export function useLottoData() {
  const [extraRounds, setExtraRounds] = useState<LottoRound[]>([]);
  const [status, setStatus] = useState<DataStatus>("loading");
  const [updateMsg, setUpdateMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = loadCachedRounds();
      if (cached.length > 0) {
        setExtraRounds(cached);
      }
      const cachedMax = getCachedLatestDrwNo();
      const startFrom = Math.max(BASE_MAX + 1, cachedMax + 1);
      try {
        const newRounds = await fetchMissingRounds(startFrom, startFrom + 200);
        if (!cancelled && newRounds.length > 0) {
          const merged = [...cached, ...newRounds].filter(
            (r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i
          );
          setExtraRounds(merged);
          saveCachedRounds(merged);
          const latestNo = Math.max(...newRounds.map((r) => r.drwNo));
          setUpdateMsg(`${latestNo}회차까지 업데이트됨`);
        }
      } catch {
        setUpdateMsg("네트워크 오류: 저장된 데이터를 사용합니다");
      } finally {
        if (!cancelled) setStatus("ready");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allRounds = useMemo(() => {
    const combined = [...BASE_ROUNDS, ...extraRounds];
    const unique = combined.filter(
      (r, i, arr) => arr.findIndex((x) => x.drwNo === r.drwNo) === i
    );
    return unique.sort((a, b) => a.drwNo - b.drwNo);
  }, [extraRounds]);

  const latestRound = useMemo(
    () => allRounds[allRounds.length - 1] ?? null,
    [allRounds]
  );

  return { allRounds, latestRound, status, updateMsg };
}
