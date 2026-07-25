const LT645_INFO_URL = "https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: "https://www.dhlottery.co.kr/lt645/result",
  "X-Requested-With": "XMLHttpRequest",
};

const WN_PRCHS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: "https://www.dhlottery.co.kr/wnprchsplcsrch/home",
  "X-Requested-With": "XMLHttpRequest",
};

function formatYmd(ymd) {
  if (!ymd || String(ymd).length !== 8) return "";
  const s = String(ymd);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function parsePyonyStores(html, rankNo) {
  const stores = [];
  const sectionNeedle = rankNo === 1 ? "1등 당첨지역 판매점" : "2등 당첨지역 판매점";
  const sectionIdx = html.indexOf(sectionNeedle);
  if (sectionIdx < 0) return [];

  const slice = html.slice(sectionIdx, sectionIdx + 120000);
  const rowRegex =
    /<tr>\s*<th scope="row"[^>]*>(\d+)<\/th>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)/g;
  let match;
  while ((match = rowRegex.exec(slice)) !== null) {
    const address = match[4]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!address || address.length < 4) continue;
    stores.push({
      name: match[2].trim(),
      pickType: match[3].trim(),
      address,
    });
  }
  return stores;
}

function parseDhlotteryStoreTable(html, rankNo) {
  if (html.length > 50000 && !html.includes("<table")) return [];
  const stores = [];
  const sectionNeedle = rankNo === 1 ? "1등" : "2등";
  const sectionIdx = html.indexOf(sectionNeedle);
  if (sectionIdx < 0) return [];

  const slice = html.slice(sectionIdx, sectionIdx + 12000);
  const rowRegex =
    /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]+)<\/td>/g;
  let match;
  while ((match = rowRegex.exec(slice)) !== null) {
    stores.push({
      name: match[2].trim(),
      pickType: match[3].trim() || "-",
      address: match[4].trim(),
    });
  }
  return stores;
}

export async function fetchRoundDetail(drwNo) {
  try {
    const res = await fetch(`${LT645_INFO_URL}?srchLtEpsd=${drwNo}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.data?.list?.[0];
    if (!item || Number(item.ltEpsd) !== Number(drwNo)) return null;

    return {
      drwNo: item.ltEpsd,
      drwNoDate: formatYmd(item.ltRflYmd),
      totalSales: item.rlvtEpsdSumNtslAmt,
      prizes: [
        {
          rank: 1,
          winners: item.rnk1WnNope,
          amount: item.rnk1WnAmt,
          totalAmount: item.rnk1SumWnAmt,
        },
        {
          rank: 2,
          winners: item.rnk2WnNope,
          amount: item.rnk2WnAmt,
          totalAmount: item.rnk2SumWnAmt,
        },
        {
          rank: 3,
          winners: item.rnk3WnNope,
          amount: item.rnk3WnAmt,
          totalAmount: item.rnk3SumWnAmt,
        },
        {
          rank: 4,
          winners: item.rnk4WnNope,
          amount: item.rnk4WnAmt,
          totalAmount: item.rnk4SumWnAmt,
        },
        {
          rank: 5,
          winners: item.rnk5WnNope,
          amount: item.rnk5WnAmt,
          totalAmount: item.rnk5SumWnAmt,
        },
      ],
      stores1: [],
      stores2: [],
    };
  } catch {
    return null;
  }
}

export async function fetchWinStoresFromPyony(drwNo, rankNo = 1) {
  try {
    const res = await fetch(`https://pyony.com/lotto/rounds/${drwNo}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const needle = rankNo === 1 ? "1등 당첨지역 판매점" : "2등 당첨지역 판매점";
    if (!html.includes(needle)) return [];
    return parsePyonyStores(html, rankNo);
  } catch {
    return [];
  }
}

export async function fetchWinStoresFromWnprchs(drwNo, rankNo) {
  try {
    const jar = new Map();
    const absorb = (res) => {
      const set = res.headers.getSetCookie?.() ?? [];
      for (const c of set) {
        const [pair] = c.split(";");
        const [k, v] = pair.split("=");
        if (k && v) jar.set(k.trim(), v.trim());
      }
    };
    const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

    const homeRes = await fetch("https://www.dhlottery.co.kr/wnprchsplcsrch/home", {
      headers: {
        "User-Agent": WN_PRCHS_HEADERS["User-Agent"],
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    absorb(homeRes);
    await homeRes.text();

    const perPage = 200;
    let pageIndex = 1;
    const stores = [];

    while (true) {
      const url = new URL("https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do");
      url.searchParams.set("srchWnShpRnk", rankNo === 1 ? "rank1" : "rank2");
      url.searchParams.set("srchLtEpsd", String(drwNo));
      url.searchParams.set("pageIndex", String(pageIndex));
      url.searchParams.set("recordCountPerPage", String(perPage));

      const res = await fetch(url, {
        headers: {
          ...WN_PRCHS_HEADERS,
          ...(cookieHeader() ? { Cookie: cookieHeader() } : {}),
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) break;

      const json = await res.json();
      const list = json?.data?.list ?? [];
      const total = Number(json?.data?.total) || 0;

      for (const item of list) {
        if (Number(item.wnShpRnk) !== rankNo) continue;
        const address = String(item.shpAddr ?? "")
          .replace(/\s+/g, " ")
          .trim();
        const name = String(item.shpNm ?? "").trim();
        if (!name || !address) continue;
        stores.push({
          name,
          pickType: String(item.atmtPsvYnTxt ?? "").trim() || "-",
          address,
        });
      }

      if (pageIndex * perPage >= total || list.length === 0) break;
      pageIndex += 1;
    }

    return stores;
  } catch {
    return [];
  }
}

export async function fetchWinStoresFromDhlottery(drwNo, rankNo) {
  try {
    const body = `method=topStore&nowPage=1&rankNo=${rankNo}&gameNo=5133&drwNo=${drwNo}&schKey=all&schVal=`;
    const res = await fetch(
      "https://www.dhlottery.co.kr/store.do?method=topStore&pageGubun=L645",
      {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: "https://www.dhlottery.co.kr/store.do?method=topStore&pageGubun=L645",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
        body,
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    if (html.length > 50000 && !html.includes("<table")) return [];
    return parseDhlotteryStoreTable(html, rankNo);
  } catch {
    return [];
  }
}

export async function fetchWinStores(drwNo, rankNo) {
  if (rankNo === 1) {
    const pyony = await fetchWinStoresFromPyony(drwNo, 1);
    if (pyony.length > 0) return pyony;
    const wnprchs = await fetchWinStoresFromWnprchs(drwNo, 1);
    if (wnprchs.length > 0) return wnprchs;
    return fetchWinStoresFromDhlottery(drwNo, 1);
  }

  const pyony = await fetchWinStoresFromPyony(drwNo, 2);
  if (pyony.length > 0) return pyony;
  const wnprchs = await fetchWinStoresFromWnprchs(drwNo, 2);
  if (wnprchs.length > 0) return wnprchs;
  return fetchWinStoresFromDhlottery(drwNo, 2);
}
