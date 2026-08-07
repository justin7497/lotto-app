const TAIL_COUNT = 60;

/**
 * @param {(drwNo: number) => Promise<object | null>} fetchRound
 * @param {() => Promise<object | null>} findLatestRound
 */
export async function buildLottoSyncPayload(fetchRound, findLatestRound) {
  const latest = await findLatestRound();
  if (!latest) {
    throw new Error("Could not resolve latest lotto round");
  }

  const rounds = [];
  const start = Math.max(1, latest.drwNo - TAIL_COUNT + 1);
  for (let drwNo = start; drwNo <= latest.drwNo; drwNo += 1) {
    const round = drwNo === latest.drwNo ? latest : await fetchRound(drwNo);
    if (round) rounds.push(round);
  }

  return {
    updatedAt: new Date().toISOString(),
    latestDrwNo: latest.drwNo,
    rounds,
  };
}
