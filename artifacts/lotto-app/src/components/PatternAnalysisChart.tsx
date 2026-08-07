import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLottoContext } from "@/context/LottoDataContext";
import type { LottoRound } from "@/data/types";
import {
  buildDrawOrderPath,
  buildRouteCellKeySet,
  getDrawOrderNumbers,
  gridCellKey,
  gridCellToNumber,
  numberGridCell,
  PATTERN_CELL_SIZE,
  PATTERN_GRID_COLS,
  PATTERN_GRID_ROWS,
  PATTERN_VIEW_SIZE,
} from "@/utils/patternAnalysis";

const GRID_CELL_COUNT = PATTERN_GRID_COLS * PATTERN_GRID_ROWS;

function formatDrawDateDot(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export default function PatternAnalysisChart() {
  const { allRounds, status } = useLottoContext();
  const rounds = useMemo(
    () => [...allRounds].sort((a, b) => b.drwNo - a.drwNo),
    [allRounds],
  );
  const latestDrwNo = rounds[0]?.drwNo ?? null;
  const minDrwNo = rounds[rounds.length - 1]?.drwNo ?? 1;
  const maxDrwNo = rounds[0]?.drwNo ?? 1;

  const [selectedDrwNo, setSelectedDrwNo] = useState<number | null>(latestDrwNo);

  useEffect(() => {
    if (latestDrwNo !== null) {
      setSelectedDrwNo((prev) => prev ?? latestDrwNo);
    }
  }, [latestDrwNo]);

  const activeDrwNo = selectedDrwNo ?? latestDrwNo ?? 1;
  const selectedIndex = rounds.findIndex((r) => r.drwNo === activeDrwNo);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const round: LottoRound | undefined = rounds[safeIndex] ?? rounds[0];

  const drawNumbers = useMemo(
    () => (round ? getDrawOrderNumbers(round) : []),
    [round],
  );
  const winningSet = useMemo(() => new Set(drawNumbers), [drawNumbers]);
  const pathPoints = useMemo(
    () => buildDrawOrderPath(drawNumbers, PATTERN_CELL_SIZE),
    [drawNumbers],
  );
  const pathCellKeys = useMemo(() => buildRouteCellKeySet(drawNumbers), [drawNumbers]);

  function goPrev() {
    if (safeIndex < rounds.length - 1) {
      setSelectedDrwNo(rounds[safeIndex + 1].drwNo);
    }
  }

  function goNext() {
    if (safeIndex > 0) {
      setSelectedDrwNo(rounds[safeIndex - 1].drwNo);
    }
  }

  if (status === "loading" && rounds.length === 0) {
    return <p className="text-base text-center text-gray-500 py-8">불러오는 중…</p>;
  }

  if (!round) {
    return <p className="text-base text-center text-gray-500 py-8">당첨 데이터가 없습니다.</p>;
  }

  return (
    <div className="pattern-chart space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed m-0">
        당첨 번호를 <strong className="text-[#127a6e]">추첨 순서</strong>대로, 격자 칸을
        따라 선으로 연결합니다.
      </p>

      <div className="pattern-chart__board">
        <div className="pattern-chart__head">
          <span className="pattern-chart__round">제 {round.drwNo}회</span>
          <span className="pattern-chart__date">{formatDrawDateDot(round.drwNoDate)}</span>
        </div>

        <div className="pattern-chart__stage">
          <button
            type="button"
            className="pattern-chart__nav pattern-chart__nav--prev"
            onClick={goPrev}
            disabled={safeIndex >= rounds.length - 1}
            aria-label="이전 회차"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <div className="pattern-chart__grid-wrap">
            <div
              className="pattern-chart__grid"
              style={{
                gridTemplateColumns: `repeat(${PATTERN_GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${PATTERN_GRID_ROWS}, 1fr)`,
              }}
            >
              {Array.from({ length: GRID_CELL_COUNT }, (_, idx) => {
                const row = Math.floor(idx / PATTERN_GRID_COLS);
                const col = idx % PATTERN_GRID_COLS;
                const cell = { row, col };
                const n = gridCellToNumber(row, col);
                const isWin = n !== null && winningSet.has(n);
                const onPath = pathCellKeys.has(gridCellKey(cell));
                return (
                  <div
                    key={`${row}-${col}`}
                    className={[
                      "pattern-chart__cell",
                      n === null ? "pattern-chart__cell--empty" : "",
                      isWin ? "pattern-chart__cell--win" : "",
                      onPath && !isWin ? "pattern-chart__cell--path" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {n !== null && !isWin ? (
                      <span className="pattern-chart__num">{n}</span>
                    ) : null}
                    {!isWin && onPath && n === null ? (
                      <span className="pattern-chart__path-dot" aria-hidden />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <svg
              className="pattern-chart__lines"
              viewBox={`0 0 ${PATTERN_VIEW_SIZE} ${PATTERN_VIEW_SIZE}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <polyline
                className="pattern-chart__path-glow"
                points={pathPoints}
                fill="none"
                strokeWidth={26}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="pattern-chart__path"
                points={pathPoints}
                fill="none"
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div
              className="pattern-chart__labels"
              style={{
                gridTemplateColumns: `repeat(${PATTERN_GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${PATTERN_GRID_ROWS}, 1fr)`,
              }}
              aria-hidden
            >
              {drawNumbers.map((n, i) => {
                const { row, col } = numberGridCell(n);
                return (
                  <div
                    key={`${round.drwNo}-label-${n}`}
                    className="pattern-chart__label-cell"
                    style={{ gridRow: row + 1, gridColumn: col + 1 }}
                  >
                    <span className="pattern-chart__ball-num">{n}</span>
                    <span className="pattern-chart__order">{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="pattern-chart__nav pattern-chart__nav--next"
            onClick={goNext}
            disabled={safeIndex <= 0}
            aria-label="다음 회차"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        <ol className="pattern-chart__legend" aria-label="추첨 순서">
          {drawNumbers.map((n, i) => (
            <li key={`${round.drwNo}-${i}`}>
              <span className="pattern-chart__legend-idx">{i + 1}</span>
              <span className="pattern-chart__legend-num">{n}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="pattern-chart__slider-block">
        <label htmlFor="pattern-round-slider" className="pattern-chart__slider-label">
          회차 선택
        </label>
        <input
          id="pattern-round-slider"
          type="range"
          className="pattern-chart__slider"
          min={0}
          max={Math.max(0, rounds.length - 1)}
          value={safeIndex}
          onChange={(e) => {
            const next = rounds[Number(e.target.value)];
            if (next) setSelectedDrwNo(next.drwNo);
          }}
        />
        <div className="pattern-chart__slider-meta">
          <span>{minDrwNo}회</span>
          <strong>제 {round.drwNo}회</strong>
          <span>{maxDrwNo}회</span>
        </div>
      </div>
    </div>
  );
}
