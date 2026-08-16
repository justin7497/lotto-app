const { parseDhlotteryWinV, extractDhlotteryV } = await import(
  "../artifacts/lotto-app/src/utils/dhlotteryQr.ts"
);
const { encodeMobileSlip, encodeGamesToMobileSlipPayload, parseMobileSlip, countSlipSheets } =
  await import("../artifacts/lotto-app/src/utils/mobileSlip.ts");
const { resolveSlipPickForEncode, normalizeSlipGameForEncode } = await import(
  "../artifacts/lotto-app/src/utils/slipPickResolve.ts"
);
const { classifySlipPick, normalizeSlipPickForEncode, assertTerminalSafeSlipPayload } = await import(
  "../artifacts/lotto-app/src/utils/slipEncodeRules.ts"
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

// 자동/반자동 — 번호 없이 전부 자동 (Q:)
{
  const resolved = resolveSlipPickForEncode([], { autoSemi: true });
  assert(resolved.mode === "A" && resolved.numbers.length === 0, "autoSemi empty -> A");
  const payload = encodeMobileSlip([resolved]);
  assert(payload === "MSG_ESLIP{10645}{(1,Q:)}{}F7|", "autoSemi single auto payload");
}

// 복똑방 공식 앱 자동 1게임 실측
{
  const payload = "MSG_ESLIP{10645}{(1,Q:)}{}F7|";
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null && eslip.checksumOk, "bokddokbang auto checksum");
  assert(eslip?.games[0]?.mode === "A", "bokddokbang auto mode");
}

// 반자동 — H: 가변 길이 (M:+00 은 단말기 「잘못된 게임 데이터」)
{
  const payload = encodeMobileSlip([{ numbers: [13, 18], mode: "M" }]);
  assert(payload === "MSG_ESLIP{10645}{(1,H:1318)}{}8F|", "semi-auto uses H:1318");
  assert(payload.includes("H:"), "eslip semi uses H:");
  assert(!payload.includes("M:1318"), "eslip must not use short M: for semi");
  assert(!payload.includes("000000"), "eslip must not 00-pad semi");
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null && eslip.checksumOk, "semi-auto checksum");
  sameNums(eslip?.games[0]?.numbers, [13, 18], "semi-auto H: digits");
}

// mode A인데 번호가 남아 있어도 QR은 Q:
{
  const normalized = normalizeSlipGameForEncode({ numbers: [1, 2, 3, 4, 5, 6], mode: "A" });
  const payload = encodeMobileSlip([normalized]);
  assert(payload === "MSG_ESLIP{10645}{(1,Q:)}{}F7|", "normalize strips numbers for auto");
}

// MSG_ESLIP 반자동 H: + 자동 Q:
{
  const payload = encodeMobileSlip([
    { numbers: [13, 18], mode: "M" },
    { numbers: [], mode: "A" },
  ]);
  assert(payload === "MSG_ESLIP{10645}{(2,H:1318,Q:)}{}57|", "semi+auto payload");
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null, "eslip parse");
  if (eslip) {
    assert(eslip.games.length === 2, "eslip game count");
    sameNums(eslip.games[0].numbers, [13, 18], "eslip semi");
    assert(eslip.games[1].mode === "A", "eslip auto mode");
    assert(eslip.checksumOk, "eslip semi+auto checksum");
  }
}

// MSG_ESLIP 5게임 전부 자동
{
  const payload = encodeMobileSlip(
    Array.from({ length: 5 }, () => ({ numbers: [], mode: "A" as const })),
  );
  assert(payload === "MSG_ESLIP{10645}{(5,Q:,Q:,Q:,Q:,Q:)}{}A6|", "eslip 5 auto payload");
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null && eslip.checksumOk, "eslip 5 auto parse");
  if (eslip) {
    assert(eslip.games.length === 5, "eslip 5 auto count");
    assert(eslip.games.every((g) => g.mode === "A" && g.numbers.length === 0), "eslip 5 auto modes");
  }
}

// MSG_ESLIP 수동 2 + 자동 3 (현장 혼합 케이스)
{
  const payload = encodeMobileSlip([
    { numbers: [7, 13, 17, 22, 23, 24], mode: "M" },
    { numbers: [14, 15, 16, 18, 38, 43], mode: "M" },
    { numbers: [], mode: "A" },
    { numbers: [], mode: "A" },
    { numbers: [], mode: "A" },
  ]);
  assert(
    payload === "MSG_ESLIP{10645}{(5,M:071317222324,M:141516183843,Q:,Q:,Q:)}{}29|",
    "eslip mixed manual+auto payload",
  );
}

// MSG_ESLIP 5게임 전부 자동
{
  const payload = encodeMobileSlip(
    Array.from({ length: 5 }, () => ({ numbers: [], mode: "A" as const })),
  );
  assert(payload === "MSG_ESLIP{10645}{(5,Q:,Q:,Q:,Q:,Q:)}{}A6|", "eslip 5 auto payload");
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null && eslip.checksumOk, "eslip 5 auto parse");
  if (eslip) {
    assert(eslip.games.length === 5, "eslip 5 auto count");
    assert(eslip.games.every((g) => g.mode === "A" && g.numbers.length === 0), "eslip 5 auto modes");
  }
}

// MSG_ESLIP 수동 2 + 자동 3 (현장 혼합 케이스)
{
  const payload = encodeMobileSlip([
    { numbers: [7, 13, 17, 22, 23, 24], mode: "M" },
    { numbers: [14, 15, 16, 18, 38, 43], mode: "M" },
    { numbers: [], mode: "A" },
    { numbers: [], mode: "A" },
    { numbers: [], mode: "A" },
  ]);
  assert(
    payload === "MSG_ESLIP{10645}{(5,M:071317222324,M:141516183843,Q:,Q:,Q:)}{}29|",
    "eslip mixed manual+auto payload",
  );
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

// slipEncodeRules — 저장 번호 → 슬립 판정 (단일 규칙)
{
  assert(classifySlipPick({ mode: "A", numbers: [] }) === "auto", "saved auto");
  assert(classifySlipPick({ mode: "A", numbers: [1, 2, 3, 4, 5, 6] }) === "auto", "auto wins over stale numbers");
  assert(classifySlipPick({ mode: "M", numbers: [13, 18] }) === "semi", "saved semi 2");
  assert(classifySlipPick({ mode: "M", numbers: [6, 10, 12, 18, 23, 27] }) === "manual", "saved manual 6");
  assert(classifySlipPick({ numbers: [7, 11, 16, 28] }) === "semi", "legacy semi no mode");

  const savedAuto = normalizeSlipPickForEncode({ mode: "A", numbers: [3, 9, 15] });
  assert(savedAuto.kind === "auto" && savedAuto.numbers.length === 0, "normalize saved auto strips numbers");
}

// slipRound — 회차별 Map 초기화 회귀 (node 테스트용 인라인)
{
  const order: number[] = [];
  const map = new Map<number, unknown[]>();
  const sheets = [
    { drwNo: 1237, id: "a" },
    { drwNo: 1236, id: "b" },
    { drwNo: 1236, id: "c" },
  ];
  for (const sheet of sheets) {
    if (!map.has(sheet.drwNo)) {
      order.push(sheet.drwNo);
      map.set(sheet.drwNo, []);
    }
    map.get(sheet.drwNo)!.push(sheet);
  }
  assert(order.length === 2 && map.get(1236)!.length === 2, "slipRound map init");
}

// 연속 발행: 15게임 → QR 1개 · 블록 3개 (불변 규칙)
{
  const games = Array.from({ length: 15 }, (_, i) => ({
    numbers: [1, 2, 3, 4, 5, ((i % 39) + 6) as number],
    mode: "M" as const,
  }));
  assert(countSlipSheets(games.length) === 3, "15 games = 3 physical sheets");
  const payload = encodeGamesToMobileSlipPayload(games);
  assert(payload.includes(")("), "multi-block joined with )(");
  const blocks = payload.match(/\(\d+,/g) ?? [];
  assert(blocks.length === 3, "continuous QR has 3 blocks");
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null && eslip.checksumOk, "continuous 15 checksum");
  assert(eslip?.games.length === 15, "continuous 15 games parsed");
  assert(eslip?.slipCount === 3, "continuous slipCount 3");
}

// 고정번호 5게임 현장 케이스: 수동1 + 반자동4 — 2026-08-04 단말기 출력
{
  const payload = encodeMobileSlip([
    { numbers: [2, 7, 11, 15, 16, 44], mode: "M" },
    { numbers: [2, 7, 15, 16], mode: "M" },
    { numbers: [7, 10, 16, 28], mode: "M" },
    { numbers: [7, 44], mode: "M" },
    { numbers: [7, 11, 16, 28], mode: "M" },
  ]);
  assert(
    payload ===
      "MSG_ESLIP{10645}{(5,M:020711151644,H:02071516,H:07101628,H:0744,H:07111628)}{}6B|",
    "fixed 5-game H: semi",
  );
  const eslip = parseMobileSlip(payload);
  assert(eslip !== null && eslip.checksumOk, "fixed 5-game checksum");
  sameNums(eslip?.games[3]?.numbers, [7, 44], "D semi 2 nums");
  assertTerminalSafeSlipPayload(payload);
}

// 단말기 금지 토큰 — 인쇄용 QR로 내보내면 안 됨
{
  let paddedMThrew = false;
  try {
    assertTerminalSafeSlipPayload("MSG_ESLIP{10645}{(1,M:131800000000)}{}13|");
  } catch {
    paddedMThrew = true;
  }
  assert(paddedMThrew, "M:+00 pad must not pass terminal assert");

  let autoAThrew = false;
  try {
    assertTerminalSafeSlipPayload("MSG_ESLIP{10645}{(1,A:)}{}00|");
  } catch {
    autoAThrew = true;
  }
  assert(autoAThrew, "A: must not pass terminal assert");
}

// 번호 10·20 반자동 — 00 오탐 없이 H:
{
  const payload = encodeMobileSlip([{ numbers: [10, 20], mode: "M" }]);
  assert(payload.includes("H:1020"), "semi 10,20 uses H:1020");
  assert(!payload.includes("M:"), "semi 10,20 must not use M:");
  assertTerminalSafeSlipPayload(payload);
}

// 구 v4 M:+00 패싱 호환 (인코딩은 H:만 출력)
{
  const eslip = parseMobileSlip(
    "MSG_ESLIP{10645}{(1,M:131800000000)}{}13|",
  );
  assert(eslip !== null, "parse v4 padded M:");
  sameNums(eslip?.games[0]?.numbers, [13, 18], "v4 pad still 13,18");
}

// 구 가변 길이 M: 파싱 호환 (인코딩은 12자리만 출력)
{
  const eslip = parseMobileSlip("MSG_ESLIP{10645}{(1,M:1318)}{}40|");
  assert(eslip !== null, "parse short M: legacy");
  sameNums(eslip?.games[0]?.numbers, [13, 18], "short M: still 13,18");
}

console.log("OK: qr-import regression tests passed");
