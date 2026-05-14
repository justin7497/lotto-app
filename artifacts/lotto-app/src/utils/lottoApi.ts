import type { LottoRound } from "@/data/types";

const CACHE_KEY = "lotto_cached_rounds";
const CACHE_LATEST_KEY = "lotto_cached_latest_drwNo";

const DHLOTTERY_URL =
  "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

interface DhlotteryResponse {
  returnValue: string;
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
}

function getProxyBase(): string {
  return "/api";
}

async function fetchRoundViaProxy(drwNo: number): Promise<LottoRound | null> {
  try {
    const res = await fetch(`${getProxyBase()}/lotto/${drwNo}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LottoRound;
    if (typeof data.drwNo !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchBatchViaProxy(
  fromDrwNo: number,
  toDrwNo: number
): Promise<LottoRound[]> {
  try {
    const res = await fetch(
      `${getProxyBase()}/lotto/batch?from=${fromDrwNo}&to=${toDrwNo}`,
      { signal: AbortSignal.timeout(60000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as LottoRound[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

async function fetchRoundDirect(drwNo: number): Promise<LottoRound | null> {
  try {
    const res = await fetch(`${DHLOTTERY_URL}${drwNo}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) return null;
    const text = await res.text();
    if (!text.trim().startsWith("{")) return null;
    const data: DhlotteryResponse = JSON.parse(text);
    if (data.returnValue !== "success") return null;
    return {
      drwNo: data.drwNo,
      drwNoDate: data.drwNoDate,
      drwtNo1: data.drwtNo1,
      drwtNo2: data.drwtNo2,
      drwtNo3: data.drwtNo3,
      drwtNo4: data.drwtNo4,
      drwtNo5: data.drwtNo5,
      drwtNo6: data.drwtNo6,
      bnusNo: data.bnusNo,
    };
  } catch {
    return null;
  }
}

async function storeRoundsOnServer(rounds: LottoRound[]): Promise<void> {
  if (rounds.length === 0) return;
  try {
    await fetch(`${getProxyBase()}/lotto/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rounds),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
  }
}

export async function fetchMissingRounds(
  fromDrwNo: number,
  toDrwNo: number
): Promise<LottoRound[]> {
  const proxyResults = await fetchBatchViaProxy(fromDrwNo, toDrwNo);
  if (proxyResults.length > 0) {
    return proxyResults;
  }

  const directResults: LottoRound[] = [];
  for (let i = fromDrwNo; i <= toDrwNo; i++) {
    const proxyRound = await fetchRoundViaProxy(i);
    if (proxyRound) {
      directResults.push(proxyRound);
      continue;
    }
    const directRound = await fetchRoundDirect(i);
    if (directRound) {
      directResults.push(directRound);
    } else {
      break;
    }
  }

  if (directResults.length > 0) {
    storeRoundsOnServer(directResults).catch(() => {});
  }

  return directResults;
}

export function loadCachedRounds(): LottoRound[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];
    return JSON.parse(cached) as LottoRound[];
  } catch {
    return [];
  }
}

export function saveCachedRounds(rounds: LottoRound[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rounds));
    if (rounds.length > 0) {
      const maxDrwNo = Math.max(...rounds.map((r) => r.drwNo));
      localStorage.setItem(CACHE_LATEST_KEY, String(maxDrwNo));
    }
  } catch {}
}

export function getCachedLatestDrwNo(): number {
  try {
    const val = localStorage.getItem(CACHE_LATEST_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}
