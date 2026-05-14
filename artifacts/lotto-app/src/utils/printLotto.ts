/**
 * printLotto.ts — 실물 슬립지에 마킹 인쇄
 *
 * ● 슬립지 크기 : 190mm × 83mm (가로/Landscape)
 * ● 배경 이미지 없음 — 마킹 타원만 출력 (슬립지 자체가 용지)
 * ● 게임 A~E : 왼→오른쪽(X축) 방향, 27mm 간격 배열
 * ● 번호 배열 : 7열 × 7행 (1~7, 8~14, …, 43~45 + 빈 4칸)
 *
 * testPrintLotto()    : 모든 칸 위치를 격자+번호로 표시 → 슬립지에 직접 인쇄
 * printLottoNumbers() : 선택 번호에 채워진 타원 출력 → 실물 슬립지에 인쇄
 */

import type { GeneratedNumbers } from "@/data/types";
import {
  SLIP_W, SLIP_H,
  COLS, ROWS,
  MARK_W, MARK_H,
  cellMm,
} from "@/utils/printCalibration";
import type { PrintCalibration } from "@/utils/printCalibration";

const GAMES = ["A", "B", "C", "D", "E"];

function mm(v: number) { return `${v.toFixed(3)}mm`; }

// ─── @page + 공통 CSS (세로/Portrait 모드) ──────────────────────────
// 슬립지 내용(190×83mm)을 90° CW 회전해 세로 페이지(83×190mm)에 꼭 맞게 배치
// transform: rotate(90deg) translateY(-83mm) / transform-origin: 0 0
// → 내용 (0,0)~(190,83) 이 출력 (0,0)~(83,190) 에 정확히 매핑됨
function buildHtml(bodyContent: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
      margin: 0; padding: 0;
    }
    @page {
      size: ${SLIP_H}mm ${SLIP_W}mm;
      margin: 0;
    }
    html, body {
      width: ${SLIP_H}mm;
      height: ${SLIP_W}mm;
      background: #fff;
      overflow: hidden;
    }
    @media screen {
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #888;
        width: 100vw;
        height: 100vh;
      }
      #slip {
        box-shadow: 0 0 24px rgba(0,0,0,0.6);
      }
    }
  </style>
</head>
<body>
  <div id="slip" style="position:relative;width:${mm(SLIP_H)};height:${mm(SLIP_W)};background:#fff;overflow:hidden;">
    <div style="position:absolute;width:${mm(SLIP_W)};height:${mm(SLIP_H)};transform:rotate(-90deg) translateX(-${mm(SLIP_W)});transform-origin:0 0;">
      ${bodyContent}
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`;
}

// ─── 팝업 열기 ─────────────────────────────────────────────────────
function openPrintWindow(html: string) {
  const win = window.open("", "_blank", "width=400,height=900");
  if (!win) {
    alert("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ─── 테스트: 모든 셀 위치를 격자 + 번호로 표시 ───────────────────
function renderTestGrid(cal: PrintCalibration): string {
  const parts: string[] = [];

  for (let gi = 0; gi < GAMES.length; gi++) {
    const gameBaseX = cal.startX + gi * cal.gamePitch;

    // 게임 레이블 (A/B/C/D/E) — 번호 그리드 위
    const labelX = gameBaseX;
    const labelY = Math.max(0.5, cal.startY - 4.5);
    parts.push(`
      <div style="
        position:absolute;
        left:${mm(labelX)};
        top:${mm(labelY)};
        font-size:3mm; font-weight:bold; color:rgba(200,0,0,0.85);
        line-height:1;
      ">${GAMES[gi]}</div>`);

    // 각 번호 셀 (1~45)
    for (let num = 1; num <= 45; num++) {
      const { x, y } = cellMm(num, gi, cal);
      parts.push(`
        <div style="
          position:absolute;
          left:${mm(x - cal.colPitch / 2)};
          top:${mm(y - cal.rowPitch / 2)};
          width:${mm(cal.colPitch)};
          height:${mm(cal.rowPitch)};
          border:0.15mm solid rgba(0,0,0,0.35);
          box-sizing:border-box;
          display:flex; align-items:center; justify-content:center;
          font-size:1.8mm; color:rgba(0,0,0,0.5); line-height:1;
        ">${num}</div>`);
    }

    // 게임 구분 세로선 (마지막 게임 제외)
    if (gi < GAMES.length - 1) {
      const lineX = gameBaseX + (COLS - 0.5) * cal.colPitch;
      const lineTop = cal.startY - cal.rowPitch * 0.5;
      parts.push(`
        <div style="
          position:absolute;
          left:${mm(lineX)};
          top:${mm(Math.max(0, lineTop))};
          width:0.25mm;
          height:${mm(ROWS * cal.rowPitch)};
          background:rgba(0,0,0,0.25);
        "></div>`);
    }
  }

  return parts.join("");
}

// ─── 실제 마킹: 채워진 타원 ───────────────────────────────────────
function renderMarks(
  sets: (number[] | null)[],
  cal: PrintCalibration,
): string {
  const parts: string[] = [];
  const markW = MARK_W;
  const markH = MARK_H;

  sets.forEach((nums, gi) => {
    if (!nums) return;
    nums.forEach(n => {
      const { x, y } = cellMm(n, gi, cal);
      parts.push(`
        <div style="
          position:absolute;
          left:${mm(x - markW / 2)};
          top:${mm(y - markH / 2)};
          width:${mm(markW)};
          height:${mm(markH)};
          background:#000;
          border-radius:50%;
        "></div>`);
    });
  });
  return parts.join("");
}

// ─── 공개 API ────────────────────────────────────────────────────────

/**
 * 테스트 인쇄
 * 슬립지에 직접 격자+번호를 인쇄 → 위치 확인 후 보정
 */
export function testPrintLotto(cal: PrintCalibration): void {
  openPrintWindow(buildHtml(renderTestGrid(cal), "로또 인쇄 테스트"));
}

/**
 * 실제 인쇄
 * 슬립지를 가로(Landscape, 190×83mm)로 프린터에 넣고 인쇄
 * sets[0]=게임A … sets[4]=게임E  (null=빈 게임)
 * 6세트 이상은 슬립 2장으로 페이지 나눔
 */
export function printLottoNumbers(
  sets: GeneratedNumbers[],
  roundTag: string,
  cal: PrintCalibration,
): void {
  if (sets.length === 0) return;

  const allNums = sets.map(s => [...s.numbers] as number[]);

  const slips: (number[] | null)[][] = [];
  for (let i = 0; i < allNums.length; i += 5) {
    const slip: (number[] | null)[] = [];
    for (let j = 0; j < 5; j++) slip.push(allNums[i + j] ?? null);
    slips.push(slip);
  }

  if (slips.length === 1) {
    openPrintWindow(buildHtml(renderMarks(slips[0], cal), `로또 마킹 ${roundTag}`));
  } else {
    const pages = slips.map((slipSets, idx) => {
      const isLast = idx === slips.length - 1;
      const pbStyle = isLast ? "" : "page-break-after:always;break-after:page;";
      return `
        <div style="${pbStyle}position:relative;width:${mm(SLIP_H)};height:${mm(SLIP_W)};background:#fff;overflow:hidden;">
          <div style="position:absolute;width:${mm(SLIP_W)};height:${mm(SLIP_H)};transform:rotate(-90deg) translateX(-${mm(SLIP_W)});transform-origin:0 0;">
            ${renderMarks(slipSets, cal)}
          </div>
        </div>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>로또 마킹 ${roundTag}</title>
  <style>
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; margin:0; padding:0; }
    @page { size:${SLIP_H}mm ${SLIP_W}mm; margin:0; }
    html, body { background:#fff; }
    @media screen { body { background:#888; padding:8mm; } }
  </style>
</head>
<body>
  ${pages}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`;
    openPrintWindow(html);
  }
}
