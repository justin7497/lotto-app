import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { lottoRoundsTable } from "@workspace/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";

const router: IRouter = Router();

const DHLOTTERY_URL =
  "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
  "X-Requested-With": "XMLHttpRequest",
};

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

export interface LottoRound {
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

const memCache = new Map<number, LottoRound>();

async function fetchFromDhlottery(drwNo: number): Promise<LottoRound | null> {
  try {
    const res = await fetch(`${DHLOTTERY_URL}${drwNo}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) return null;

    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith("{")) return null;

    const data: DhlotteryResponse = JSON.parse(trimmed);
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

async function fetchFromPyony(drwNo: number): Promise<LottoRound | null> {
  try {
    const res = await fetch(`https://pyony.com/lotto/rounds/${drwNo}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract date from "1221회 (2026년 4월 25일 추첨)"
    const dateMatch = html.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*추첨/);
    if (!dateMatch) return null;
    const drwNoDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;

    // Extract all numberCircle elements in order
    const numRegex = /<div[^>]+numberCircle[^>]*><strong>(\d+)<\/strong><\/div>/g;
    const nums: number[] = [];
    let match;
    while ((match = numRegex.exec(html)) !== null) {
      nums.push(Number(match[1]));
    }
    // First 6 are winning numbers, 7th is bonus
    if (nums.length < 7) return null;
    const [drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo] = nums;
    return { drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo };
  } catch {
    return null;
  }
}

async function saveToDb(round: LottoRound): Promise<void> {
  try {
    await db
      .insert(lottoRoundsTable)
      .values(round)
      .onConflictDoNothing();
  } catch {
  }
}

async function getRoundFromDb(drwNo: number): Promise<LottoRound | null> {
  try {
    const rows = await db
      .select()
      .from(lottoRoundsTable)
      .where(eq(lottoRoundsTable.drwNo, drwNo))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchRound(drwNo: number): Promise<LottoRound | null> {
  if (memCache.has(drwNo)) {
    return memCache.get(drwNo)!;
  }

  const dbRow = await getRoundFromDb(drwNo);
  if (dbRow) {
    memCache.set(drwNo, dbRow);
    return dbRow;
  }

  const fetched = (await fetchFromDhlottery(drwNo)) ?? (await fetchFromPyony(drwNo));
  if (fetched) {
    memCache.set(drwNo, fetched);
    await saveToDb(fetched);
  }
  return fetched;
}

router.get("/lotto/latest", async (_req, res) => {
  let lo = 1100;
  let hi = 1350;
  let latest: LottoRound | null = null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = await fetchRound(mid);
    if (r) {
      latest = r;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (!latest) {
    res.status(503).json({ error: "최신 회차를 불러올 수 없습니다" });
    return;
  }

  res.json(latest);
});

router.get("/lotto/batch", async (req, res) => {
  const from = Number(req.query.from);
  const to = Number(req.query.to);

  if (!from || !to || from > to || to - from > 200) {
    res.status(400).json({ error: "올바른 from/to 범위를 입력하세요 (최대 200)" });
    return;
  }

  try {
    const dbRows = await db
      .select()
      .from(lottoRoundsTable)
      .where(
        and(
          gte(lottoRoundsTable.drwNo, from),
          lte(lottoRoundsTable.drwNo, to)
        )
      );

    const dbMap = new Map<number, LottoRound>(
      dbRows.map((r) => [r.drwNo, r])
    );

    const results: LottoRound[] = [];
    for (let i = from; i <= to; i++) {
      if (dbMap.has(i)) {
        results.push(dbMap.get(i)!);
        continue;
      }
      if (memCache.has(i)) {
        results.push(memCache.get(i)!);
        continue;
      }
      const fetched = (await fetchFromDhlottery(i)) ?? (await fetchFromPyony(i));
      if (fetched) {
        results.push(fetched);
        memCache.set(i, fetched);
        await saveToDb(fetched);
      } else {
        break;
      }
    }

    res.setHeader("Cache-Control", "no-store");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DRW_NO = 1;
const MAX_DRW_NO = 2000;

function isValidLottoNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 45;
}

function isValidRound(r: unknown): r is LottoRound {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  if (
    typeof o.drwNo !== "number" ||
    !Number.isInteger(o.drwNo) ||
    o.drwNo < MIN_DRW_NO ||
    o.drwNo > MAX_DRW_NO
  )
    return false;
  if (typeof o.drwNoDate !== "string" || !DATE_RE.test(o.drwNoDate))
    return false;
  const nums = [
    o.drwtNo1, o.drwtNo2, o.drwtNo3,
    o.drwtNo4, o.drwtNo5, o.drwtNo6,
  ];
  if (!nums.every(isValidLottoNumber)) return false;
  const mainSet = new Set(nums as number[]);
  if (mainSet.size !== 6) return false;
  if (!isValidLottoNumber(o.bnusNo)) return false;
  return true;
}

router.post("/lotto/store", async (req, res) => {
  const body = req.body;
  if (!Array.isArray(body) || body.length === 0 || body.length > 50) {
    res.status(400).json({ error: "올바른 회차 데이터 배열을 전송하세요 (최대 50개)" });
    return;
  }

  const validRounds = (body as unknown[]).filter(isValidRound);
  if (validRounds.length === 0) {
    res.status(400).json({ error: "유효한 회차 데이터가 없습니다" });
    return;
  }

  let saved = 0;
  for (const round of validRounds) {
    if (memCache.has(round.drwNo)) {
      continue;
    }
    const existing = await getRoundFromDb(round.drwNo);
    if (existing) {
      memCache.set(round.drwNo, existing);
      continue;
    }
    try {
      await db
        .insert(lottoRoundsTable)
        .values(round)
        .onConflictDoNothing();
      memCache.set(round.drwNo, round);
      saved++;
    } catch {}
  }

  res.json({ saved });
});

router.get("/lotto/:drwNo", async (req, res) => {
  const drwNo = Number(req.params.drwNo);
  if (!drwNo || drwNo < 1) {
    res.status(400).json({ error: "올바른 회차 번호를 입력하세요" });
    return;
  }

  const round = await fetchRound(drwNo);
  if (!round) {
    res.status(404).json({ error: "해당 회차 데이터를 찾을 수 없습니다" });
    return;
  }

  res.json(round);
});

export default router;
