import type { LottoRound } from "@/data/types";

const GRID_COLS = 7;
const GRID_ROWS = 7;

export type GridCell = { row: number; col: number };

/** 당첨번호 6개 — 추첨 순서 (drwtNo1 → drwtNo6) */
export function getDrawOrderNumbers(round: LottoRound): number[] {
  return [
    round.drwtNo1,
    round.drwtNo2,
    round.drwtNo3,
    round.drwtNo4,
    round.drwtNo5,
    round.drwtNo6,
  ];
}

/** 1~45 격자 (7열) 셀 위치 */
export function numberGridCell(n: number): GridCell {
  const idx = n - 1;
  return { row: Math.floor(idx / GRID_COLS), col: idx % GRID_COLS };
}

export function gridCellKey(cell: GridCell): string {
  return `${cell.row},${cell.col}`;
}

export function gridCellToNumber(row: number, col: number): number | null {
  const n = row * GRID_COLS + col + 1;
  return n >= 1 && n <= 45 ? n : null;
}

/** SVG viewBox 기준 셀 중심 (셀 한 변 = cellSize) */
export function gridCellCenter(
  cell: GridCell,
  cellSize: number,
): { x: number; y: number } {
  return {
    x: cell.col * cellSize + cellSize / 2,
    y: cell.row * cellSize + cellSize / 2,
  };
}

/** 두 격자 칸을 가로·세로·대각 칸 단위로 연결 (로또 패턴분석표 방식) */
function connectGridCells(from: GridCell, to: GridCell): GridCell[] {
  const path: GridCell[] = [from];
  let row = from.row;
  let col = from.col;
  const tr = to.row;
  const tc = to.col;

  const append = (r: number, c: number) => {
    const last = path[path.length - 1];
    if (last.row !== r || last.col !== c) path.push({ row: r, col: c });
  };

  while (row !== tr || col !== tc) {
    const dr = tr - row;
    const dc = tc - col;
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);
    const sr = dr > 0 ? 1 : -1;
    const sc = dc > 0 ? 1 : -1;

    if (dr === 0) {
      col += sc;
      append(row, col);
      continue;
    }

    if (dc === 0) {
      row += sr;
      append(row, col);
      continue;
    }

    if (adr === adc) {
      row += sr;
      col += sc;
      append(row, col);
      continue;
    }

    if (adc > adr) {
      row += sr;
      col += sc;
      append(row, col);
      if (row === tr && col === tc) break;

      const strip = adc - adr - 1;
      for (let i = 0; i < strip; i++) {
        col += sc;
        append(row, col);
      }
      if (row === tr && col === tc) break;

      if (row !== tr && col !== tc) {
        row += sr;
        col += sc;
        append(row, col);
      }
      continue;
    }

    row += sr;
    col += sc;
    append(row, col);
    if (row === tr && col === tc) break;

    const strip = adr - adc - 1;
    for (let i = 0; i < strip; i++) {
      row += sr;
      append(row, col);
    }
    if (row === tr && col === tc) break;

    if (row !== tr && col !== tc) {
      row += sr;
      col += sc;
      append(row, col);
    }
  }

  return path;
}

/** 추첨 순서대로 격자 경로 (공 + 사이 칸) */
export function buildGridRoute(numbers: number[]): GridCell[] {
  if (numbers.length === 0) return [];

  const route: GridCell[] = [];
  for (let i = 0; i < numbers.length; i++) {
    const from = numberGridCell(numbers[i]);
    if (i === 0) route.push(from);

    if (i < numbers.length - 1) {
      const to = numberGridCell(numbers[i + 1]);
      const segment = connectGridCells(from, to);
      for (let j = 1; j < segment.length; j++) {
        route.push(segment[j]);
      }
    }
  }

  return route;
}

export function buildDrawOrderPath(numbers: number[], cellSize: number): string {
  return buildGridRoute(numbers)
    .map((cell) => {
      const { x, y } = gridCellCenter(cell, cellSize);
      return `${x},${y}`;
    })
    .join(" ");
}

export function buildRouteCellKeySet(numbers: number[]): Set<string> {
  return new Set(buildGridRoute(numbers).map(gridCellKey));
}

export const PATTERN_GRID_COLS = GRID_COLS;
export const PATTERN_GRID_ROWS = GRID_ROWS;
export const PATTERN_CELL_SIZE = 100;
export const PATTERN_VIEW_SIZE = GRID_COLS * PATTERN_CELL_SIZE;
