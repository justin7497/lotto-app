# 모바일 슬립지 QR 인코딩 규칙 (MSG_ESLIP)

판매점 단말기가 읽는 QR과, 당첨 티켓 QR은 **서로 다른 형식**입니다.  
이 문서는 **슬립지 → QR (OUT)** 만 다룹니다.

| 방향 | 형식 | 구현 |
|------|------|------|
| OUT (발행) | `MSG_ESLIP{10645}{(N,...)}{}XX\|` | `mobileSlip.ts`, `slipEncodeRules.ts` |
| IN (당첨 티켓) | `https://qr.dhlottery.co.kr/?v=...` | `dhlotteryQr.ts` |

코드상 단일 진실: **`src/utils/slipEncodeRules.ts`**

---

## 1. 전체 페이로드 구조

```
MSG_ESLIP{상품코드}{게임블록}{}체크섬|
```

| 필드 | 값 | 설명 |
|------|-----|------|
| 상품코드 | `10645` | 로또 6/45 고정 |
| 게임블록 | `(게임수,토큰,토큰,...)` | 슬립 1장 = 최대 5게임 |
| 체크섬 | 2자리 HEX | CRC-8 (poly `0x07`, init `0x00`), 본문 `MSG_ESLIP...{}` 까지 |
| 종료 | `\|` | 필수 |

**예 — 5게임 전부 자동 (1237회 5,000원 슬립과 동일 패턴)**

```
MSG_ESLIP{10645}{(5,Q:,Q:,Q:,Q:,Q:)}{}A6|
```

**예 — 반자동 2 + 자동 3**

```
MSG_ESLIP{10645}{(5,H:1318,H:07111628,Q:,Q:,Q:)}{}
```

(체크섬은 `encodeMobileSlip`이 계산)

**예 — 현장 고정번호 5게임 (2026-08-04, 단말기 출력 확인)**

```
MSG_ESLIP{10645}{(5,M:020711151644,H:02071516,H:07101628,H:0744,H:07111628)}{}6B|
```

---

## 2. 게임 1줄 = 선택 종류 3가지

판정 함수: `classifySlipPick()` → `auto` | `semi` | `manual`

| 종류 | 저장 `slipPickMode` | `numbers` | QR 토큰 | 번호 확정 주체 |
|------|---------------------|-----------|---------|----------------|
| **자동** | `A` | 0개 (빈 배열) | `Q:` | **판매점 단말기** (스캔 시 난수) |
| **반자동** | `M` | 1~5개 | `H:` + 고른 번호만 (2자리×N) | 고른 번호만 앱, 나머지 단말기 |
| **수동** | `M` | 6개 | `M:` + 12자리 | 앱에 저장된 6개 |

### 인코딩 규칙

- 번호는 **오름차순**, **2자리 zero-pad** (`7` → `07`)
- 반자동은 **`H:` + 고른 번호만**. 예: 13,18 → `H:1318` (❌ `M:1318` ❌ `M:131800000000`)
- 수동만 `M:` + 12자리
- 게임 토큰 사이 **쉼표만** (`Q:,H:1318` — 공백 없음)
- 자동은 **반드시 `Q:`** (`A:` 금지)

### 정규화 (QR 직전 필수)

`normalizeSlipPickForEncode()`:

1. `mode === "A"` 이거나 번호 0개 → `{ mode: "A", numbers: [] }` → `Q:`
2. 번호 1~5개 → `H:` + 2자리×N (패딩 없음)
3. 번호 6개 → `M:` + 12자리

**중요:** `mode: "A"` 인데 번호 6개가 남아 있으면 **번호를 버리고 `Q:`** 로 인코딩합니다.  
(저장·발행 경로 모두 이 규칙을 따릅니다.)

---

## 3. 인코딩 버전 이력

| 버전 | 자동 | 반자동 | 비고 |
|------|------|--------|------|
| v1 | `A:` | `H:` | 자동 `A:` 때문에 거부된 것으로 보임 |
| v2 | `A:` | `M:` 가변 | 자동 토큰 문제 |
| v3 | `Q:` | `M:` 가변 | 반자동을 `M:`으로 넣어 미인식 |
| v4 | `Q:` | `M:` + 12자리 `00` | 단말기가 수동 6칸(0 포함)으로 읽어 「잘못된 게임 데이터」 |
| **v5 (현재)** | **`Q:`** | **`H:` 가변** | 2026-08-04 현장 출력과 동일 |

`SLIP_ENCODE_VERSION = 5` (`mobileSlip.ts`)

QR은 저장하지 않고 **화면을 열 때마다 다시 인코딩**한다. 예전 슬립도 v5 규칙으로 다시 그려진다.

구 페이로드(`A:`)가 localStorage에 남아 있으면 QR 화면에서 **재발행** 안내가 뜹니다. `H:` 는 정상입니다.

---

## 4. 데이터 흐름 (저장 번호 → QR)

```
번호 저장 (savedNumbers)
  → slipPickMode: A | M, numbers
  → 슬립에 넣기 (slipDraft.savedNumberToSlipGame)
  → normalizeSlipPickForEncode
  → encodeGamesToMobileSlipPayload (슬립 1장 = QR 1개, 최대 5게임)
  → QR 이미지 (slipQrRender)
```

**저장 시 검증** (`savedNumbers.sanitizeGame`):

- `A`: 번호 0개만 허용
- `M`: 번호 1~6개

**슬립 편집기** (`resolveSlipPickForEncode`):

- `autoSemi` 모드: 0개 → 자동, 1~6개 → `M:` (반자동·수동 구분은 개수로)

---

## 5. 복수 슬립 · 연속 발행 (불변)

⚠️ **절대 변경 금지** — `.cursor/rules/slip-continuous-qr.mdc`

- 물리 슬립 1장 = 최대 5게임
- **6게임 이상**을 한 번에 만들면 **QR 1개**에 블록을 이어 붙임: `(5,...)(5,...)(5,...)`
- 인코딩: `encodeGamesToMobileSlipPayload` → 5초과 시 `encodeMobileSlipPayload` / `buildMultiSlipBody`
- 저장: `issueBatchId`로 묶인 시트는 **쪼개지 않음** (`mergeIssuedBatchSheets`)
- UI: 「한 번 스캔하면 N게임이 연속 발행됩니다」
- 예: 15게임 → QR 1개 → 단말기에서 3장 연속 출력

다른 묶음(서로 다른 `issueBatchId` 또는 배치 없음)끼리만 스와이프(`2/2`)로 전환합니다.

---

## 6. 단말기 미인식 시 점검 순서

1. **raw 페이로드**에 `A:` 가 있는지 (구 버전 자동)
2. 반자동이 `H:` 인지 (`M:0744` / `M:074400000000` 이면 단말기 거부)
3. **체크섬** 2자리·끝 `|` 존재 여부
4. **게임 수** `(5,...)` 와 실제 토큰 개수 일치
5. 자동 게임이 `Q:` 인지
6. `mode: "A"` 게임에 번호가 섞여 저장되지 않았는지
7. QR **밝기·대비** (slipQrRender 설정)

---

## 7. 수정 시 필수

```bash
node scripts/test-qr-import.mjs
```

관련 파일:

- `src/utils/slipEncodeRules.ts` — 규칙 정의
- `src/utils/mobileSlip.ts` — MSG_ESLIP 조립·CRC
- `src/utils/slipPickResolve.ts` — 편집기 → 인코딩
- `src/utils/slipDraft.ts` — 저장 번호 → 슬립
- `scripts/test-qr-import-runner.ts` — 회귀 테스트
