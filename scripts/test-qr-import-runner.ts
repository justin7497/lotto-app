const { parseDhlotteryWinV, extractDhlotteryV } = await import(
  "../artifacts/lotto-app/src/utils/dhlotteryQr.ts"
);
const { encodeMobileSlip, parseMobileSlip } = await import(
  "../artifacts/lotto-app/src/utils/mobileSlip.ts"
);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function sameNums(actual: number[] | undefined, expected: number[], label: string): void {
  const ok =
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((n, i) => n === expected[i]);
  assert(ok, `${label}: expected [${expected}] got [${actual}]`);
}

// 반자동 h 접두 (h131823)
{
  const data = parseDhlotteryWinV("1215qh131823");
  assert(data?.roundNo === 1215, "h131823 round");
  sameNums(data?.games[0], [13, 18, 23], "h131823");
}

// 02 + 선택개수 (021318 → 13,18) — h 없는 반자동
{
  const data = parseDhlotteryWinV("1215q021318");
  sameNums(data?.games[0], [13, 18], "021318");
}

// h010318 → 1,3,18
{
  const data = parseDhlotteryWinV("1215qh010318");
  sameNums(data?.games[0], [1, 3, 18], "h010318");
}

// h021318 → h 제거 후 02+1318 (Jul 27 검증 케이스 — h 분기에서 바로 parse하면 깨짐)
{
  const data = parseDhlotteryWinV("1215qh021318");
  sameNums(data?.games[0], [13, 18], "h021318");
}

// h07111628 — 4개 번호
{
  const data = parseDhlotteryWinV("1215qh07111628");
  sameNums(data?.games[0], [7, 11, 16, 28], "h07111628");
}

// 12자리 00 패딩 반자동 (130018000000 → 13,18)
{
  const data = parseDhlotteryWinV("1215q130018000000");
  sameNums(data?.games[0], [13, 18], "130018000000");
}

// 12자리 선택개수+00패딩 (021318000000 → 13,18)
{
  const data = parseDhlotteryWinV("1215q021318000000");
  sameNums(data?.games[0], [13, 18], "021318000000");
}

// s 접두 반자동
{
  const data = parseDhlotteryWinV("1215qs131823");
  sameNums(data?.games[0], [13, 18, 23], "s131823");
}

// 수동 6개
{
  const data = parseDhlotteryWinV("1215q061012182327");
  sameNums(data?.games[0], [6, 10, 12, 18, 23, 27], "manual6");
}

// 자동 (0 패딩)
{
  const data = parseDhlotteryWinV("1215q000000");
  sameNums(data?.games[0], [], "auto");
}

// MSG_ESLIP 반자동 H: + 자동 A:
{
  const payload = encodeMobileSlip([
    { numbers: [13, 18], mode: "M" },
    { numbers: [], mode: "A" },
  ]);
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null, "eslip parse");
  if (eslip) {
    assert(eslip.games.length === 2, "eslip game count");
    sameNums(eslip.games[0].numbers, [13, 18], "eslip semi");
    assert(eslip.games[1].mode === "A", "eslip auto mode");
  }
}

// 실제 발행 티켓 (1236회, 수동2+반자동2, s 구분자 + n 체크섬)
{
  const url =
    "http://qr.dhlottery.co.kr/?v=1236m061722273744m030506144245s111826323542s152425263244n000000000000195138178214141022";
  const v = extractDhlotteryV(url);
  assert(v !== null, "real ticket extract v");
  const data = v ? parseDhlotteryWinV(v) : null;
  assert(data?.roundNo === 1236, "real ticket round");
  assert(data?.games.length === 4, "real ticket 4 games");
  if (data) {
    sameNums(data.games[0], [6, 17, 22, 27, 37, 44], "real A");
    sameNums(data.games[1], [3, 5, 6, 14, 42, 45], "real B");
    sameNums(data.games[2], [11, 18, 26, 32, 35, 42], "real C semi");
    sameNums(data.games[3], [15, 24, 25, 26, 32, 44], "real D semi");
    assert(data.kinds[2] === "semi" && data.kinds[3] === "semi", "real semi kinds");
  }
}

// 5게임 혼합 샘플 (q 구분자)
{
  const data = parseDhlotteryWinV(
    "0809q021825303444q050812313445q060817202240q121623253641q040809232944",
  );
  assert(data !== null && data.games.length === 5, "q-delimiter 5 games");
}

// 티켓 URL v= 추출 + 반자동·수동 혼합
{
  const v = extractDhlotteryV("https://m.dhlottery.co.kr/?v=1215qh131823m061012182327");
  assert(v === "1215qh131823m061012182327", "extract v param");
  const data = v ? parseDhlotteryWinV(v) : null;
  assert(data !== null, "ticket parse");
  if (data) {
    assert(data.games.length === 2, "ticket two games");
    sameNums(data.games[0], [13, 18, 23], "ticket semi");
    sameNums(data.games[1], [6, 10, 12, 18, 23, 27], "ticket manual");
  }
}

console.log("OK: qr-import regression tests passed");
