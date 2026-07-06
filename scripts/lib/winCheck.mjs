/** @param {string} roundTag */
export function parseRoundNo(roundTag) {
  const match = String(roundTag).match(/제(\d+)회/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * @param {number[]} numbers
 * @param {{ drwtNo1: number, drwtNo2: number, drwtNo3: number, drwtNo4: number, drwtNo5: number, drwtNo6: number, bnusNo: number }} round
 */
export function checkWin(numbers, round) {
  const winning = [
    round.drwtNo1,
    round.drwtNo2,
    round.drwtNo3,
    round.drwtNo4,
    round.drwtNo5,
    round.drwtNo6,
  ];
  const matchCount = numbers.filter((n) => winning.includes(n)).length;
  const bonusMatch = numbers.includes(round.bnusNo);

  let rank = null;
  let label = "";

  if (matchCount === 6) {
    rank = 1;
    label = "6개 일치 🎉 1등";
  } else if (matchCount === 5 && bonusMatch) {
    rank = 2;
    label = "5+보너스 일치 ✨ 2등";
  } else if (matchCount === 5) {
    rank = 3;
    label = "5개 일치 🥳 3등";
  } else if (matchCount === 4) {
    rank = 4;
    label = "4개 일치 4등";
  } else if (matchCount === 3) {
    rank = 5;
    label = "3개 일치 5등";
  } else {
    label = `${matchCount}개 일치 낙첨`;
  }

  return { matchCount, bonusMatch, rank, label };
}

/** @param {number} n */
export function ballBg(n) {
  if (n <= 10) return "#f59e0b";
  if (n <= 20) return "#3b82f6";
  if (n <= 30) return "#ef4444";
  if (n <= 40) return "#6b7280";
  return "#22c55e";
}
