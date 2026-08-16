/** 최신 회차 당첨금·판매점 — Firestore appConfig/lottoDetailSync 용 */
const DETAIL_TAIL_COUNT = 3;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

/**
 * @param {() => Promise<{ drwNo: number } | null>} findLatestRound
 * @param {(drwNo: number) => Promise<object | null>} fetchRoundDetail
 * @param {(drwNo: number, rank: 1 | 2) => Promise<object[]>} fetchWinStores
 */
export async function buildLottoDetailSyncPayload(findLatestRound, fetchRoundDetail, fetchWinStores) {
  const latest = await findLatestRound();
  if (!latest) {
    throw new Error("Could not resolve latest lotto round for detail sync");
  }

  const rounds = {};
  const start = Math.max(1, latest.drwNo - DETAIL_TAIL_COUNT + 1);

  for (let drwNo = start; drwNo <= latest.drwNo; drwNo += 1) {
    const [detail, stores1, stores2] = await Promise.all([
      fetchRoundDetail(drwNo),
      fetchWinStores(drwNo, 1),
      fetchWinStores(drwNo, 2),
    ]);

    const entry = {
      drwNo,
      drwNoDate: detail?.drwNoDate ?? "",
      totalSales: detail?.totalSales,
      prizes: detail?.prizes ?? [],
      stores1: stores1.length > 0 ? stores1 : (detail?.stores1 ?? []),
      stores2: stores2.length > 0 ? stores2 : (detail?.stores2 ?? []),
    };

    if (entry.prizes.length > 0 || entry.stores1.length > 0 || entry.stores2.length > 0) {
      rounds[String(drwNo)] = entry;
    }

    if (drwNo < latest.drwNo) {
      await sleep(120);
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    latestDrwNo: latest.drwNo,
    rounds,
  };
}
