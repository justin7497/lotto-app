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

async function fetchRoundsFromSync(
  fromDrwNo: number,
  toDrwNo: number,
): Promise<LottoRound[]> {
  try {
    const res = await fetch(`/lotto-sync.json?t=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { rounds?: LottoRound[] };
    if (!Array.isArray(data.rounds)) return [];
    return data.rounds.filter((r) => r.drwNo >= fromDrwNo && r.drwNo <= toDrwNo);
  } catch {
    return [];
  }
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

  const syncResults = await fetchRoundsFromSync(fromDrwNo, toDrwNo);
  if (syncResults.length > 0) {
    return syncResults;
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

/** 알려진 최신 회차 다음 번호가 API에 올라왔는지 즉시 확인 (배포 대기 없음) */
export async function fetchNextPublishedRound(
  afterDrwNo: number,
): Promise<LottoRound | null> {
  const target = afterDrwNo + 1;
  if (target < 1) return null;
  const viaProxy = await fetchRoundViaProxy(target);
  if (viaProxy) return viaProxy;
  return fetchRoundDirect(target);
}

/**
 * 동행복권에 공개된 최신 회차를 빠르게 찾음.
 * knownMax+1부터 순방향으로 확인 (토요 API 오픈 직후에 유리).
 */
export async function fetchNewestPublishedRound(
  knownMax: number,
): Promise<LottoRound | null> {
  let latest: LottoRound | null = null;
  let cursor = Math.max(1, knownMax + 1);
  // 한 번에 최대 5회차까지 (통상 1회차만 새로 생김)
  for (let i = 0; i < 5; i += 1) {
    const round = await fetchNextPublishedRound(cursor - 1);
    if (!round) break;
    latest = round;
    cursor = round.drwNo + 1;
  }
  return latest;
}

export async function fetchRemoteLatestDrwNo(): Promise<number | null> {
  try {
    const res = await fetch(`${getProxyBase()}/lotto/latest`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { drwNo?: number };
      if (typeof data.drwNo === "number") return data.drwNo;
    }
  } catch {
    /* try sync fallback */
  }

  try {
    const res = await fetch(`/lotto-sync.json?t=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { latestDrwNo?: number };
    return typeof data.latestDrwNo === "number" ? data.latestDrwNo : null;
  } catch {
    return null;
  }
}

/** 한국(서울) 토요 추첨 직후 창 — 클라이언트 폴링용 */
export function isKoreaSaturdayDrawWindow(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (weekday !== "Sat") return false;
  if (hour < 20 || hour > 23) return false;
  if (hour === 20 && minute < 35) return false;
  return true;
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
