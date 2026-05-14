import http from "node:http";

const port = Number(process.env.API_PORT || "8080");
const savedNumbers = new Map();
const lottoCache = new Map();
const DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function fetchRound(drwNo) {
  if (lottoCache.has(drwNo)) return lottoCache.get(drwNo);

  try {
    const response = await fetch(`${DHLOTTERY_URL}${drwNo}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.returnValue !== "success") return null;

    const round = {
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
    lottoCache.set(drwNo, round);
    return round;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, mode: "local" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/saved-numbers") {
      sendJson(res, 200, Array.from(savedNumbers.values()));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/saved-numbers") {
      const body = await readBody(req);
      if (!body?.id || !Array.isArray(body.sets)) {
        sendJson(res, 400, { error: "올바른 데이터를 전송하세요" });
        return;
      }
      savedNumbers.set(body.id, body);
      sendJson(res, 200, { ok: true, id: body.id });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/saved-numbers/all") {
      savedNumbers.clear();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/saved-numbers/")) {
      savedNumbers.delete(decodeURIComponent(url.pathname.split("/").pop() || ""));
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/lotto/batch") {
      const from = Number(url.searchParams.get("from"));
      const to = Number(url.searchParams.get("to"));
      if (!from || !to || from > to || to - from > 200) {
        sendJson(res, 400, { error: "올바른 from/to 범위를 입력하세요" });
        return;
      }
      const rounds = [];
      for (let i = from; i <= to; i += 1) {
        const round = await fetchRound(i);
        if (!round) break;
        rounds.push(round);
      }
      sendJson(res, 200, rounds);
      return;
    }

    const lottoMatch = url.pathname.match(/^\/api\/lotto\/(\d+)$/);
    if (req.method === "GET" && lottoMatch) {
      const round = await fetchRound(Number(lottoMatch[1]));
      if (!round) {
        sendJson(res, 404, { error: "해당 회차 데이터를 찾을 수 없습니다" });
        return;
      }
      sendJson(res, 200, round);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/lotto/store") {
      sendJson(res, 200, { saved: 0 });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/send-results") {
      sendJson(res, 501, { error: "로컬 모드에서는 이메일 발송이 비활성화되어 있습니다" });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch {
    sendJson(res, 500, { error: "로컬 API 오류가 발생했습니다" });
  }
});

server.listen(port, () => {
  console.log(`Local API server ready at http://localhost:${port}`);
});
