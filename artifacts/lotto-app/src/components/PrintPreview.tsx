import { useState } from "react";
import { X, Printer, RotateCcw, Save, ChevronLeft, ChevronRight } from "lucide-react";
import {
  SLIP_W, SLIP_H,
  COLS, ROWS,
  COL_PITCH, ROW_PITCH,
  MARK_W, MARK_H,
  loadCalibration, saveCalibration, resetCalibration,
  cellMm,
} from "@/utils/printCalibration";
import type { PrintCalibration } from "@/utils/printCalibration";
import { testPrintLotto } from "@/utils/printLotto";

interface Props {
  sets: (number[] | null)[];
  onClose: () => void;
  onPrint: (cal: PrintCalibration) => void;
}

const GAMES = ["A", "B", "C", "D", "E"];
const ALL_NUMS = Array.from({ length: 45 }, (_, i) => i + 1);

// ─── 슬립 미리보기 크기 (가로/Landscape) ─────────────────────────────
const PREVIEW_W = 700;
const PREVIEW_H = Math.round(PREVIEW_W * (SLIP_H / SLIP_W)); // ≈ 306px
const SCALE     = PREVIEW_W / SLIP_W;                        // px/mm

function toX(v: number) { return v * SCALE; }
function toY(v: number) { return v * SCALE; }

// ─── 슬라이더 컴포넌트 ──────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  accentColor?: string;
  onChange: (v: number) => void;
}
function SliderRow({
  label, hint, value, min, max, step,
  unit = "mm", accentColor = "accent-blue-600",
  onChange,
}: SliderRowProps) {
  const sign = value > 0 ? "+" : "";
  const isOffset = min < 0;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          {hint && <span className="text-xs text-gray-400 ml-1">{hint}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="w-6 h-6 rounded border border-gray-300 text-sm font-bold flex items-center justify-center hover:bg-gray-100 active:bg-gray-200"
            onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          >−</button>
          <span className="text-xs font-mono w-16 text-center bg-gray-50 border border-gray-200 rounded px-1 py-1 tabular-nums">
            {isOffset ? `${sign}${value.toFixed(1)}` : value.toFixed(1)}{unit}
          </span>
          <button
            className="w-6 h-6 rounded border border-gray-300 text-sm font-bold flex items-center justify-center hover:bg-gray-100 active:bg-gray-200"
            onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          >+</button>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className={`w-full h-2 ${accentColor}`}
      />
    </div>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────
export default function PrintPreview({ sets, onClose, onPrint }: Props) {
  const [cal, setCal]       = useState<PrintCalibration>(loadCalibration);
  const [saved, setSaved]   = useState(false);
  const [slipIndex, setSlipIndex] = useState(0);

  const slipCount   = Math.ceil(Math.max(sets.length, 1) / 5);
  const currentSets: (number[] | null)[] = Array.from({ length: 5 }, (_, i) => sets[slipIndex * 5 + i] ?? null);

  const selected = new Set<string>();
  currentSets.forEach((nums, gi) => { if (nums) nums.forEach(n => selected.add(`${gi}-${n}`)); });

  function update<K extends keyof PrintCalibration>(key: K, value: PrintCalibration[K]) {
    setCal(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const handleSave = () => {
    saveCalibration(cal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const handleReset = () => { setCal(resetCalibration()); setSaved(false); };

  function cellPos(num: number, gi: number) {
    const { x, y } = cellMm(num, gi, cal);
    return { cx: toX(x), cy: toY(y) };
  }

  const cellWPx = COL_PITCH * SCALE;
  const cellHPx = ROW_PITCH * SCALE;
  const markWPx = MARK_W    * SCALE;
  const markHPx = MARK_H    * SCALE;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex flex-col" style={{ backdropFilter: "blur(3px)" }}>

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white flex-shrink-0">
        <Printer className="w-5 h-5 text-amber-400" />
        <span className="font-bold text-sm flex-1">실물 슬립지 인쇄 — 캘리브레이션</span>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* 좌측: 가로 슬립 미리보기 */}
        <div className="flex-1 overflow-auto bg-gray-700 p-4 flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-xs font-bold text-amber-300">
              📋 실물 슬립지 미리보기 (190 × 83mm) — 게임 A→E 왼쪽부터
            </p>
            <p className="text-xs text-gray-400 mt-0.5">슬라이더 조정 시 마킹 위치가 실시간으로 이동합니다</p>
          </div>

          {/* 슬립 페이지 네비게이션 */}
          {slipCount > 1 && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2">
              <button
                onClick={() => setSlipIndex(i => Math.max(0, i - 1))}
                disabled={slipIndex === 0}
                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div className="text-center flex-1">
                <p className="text-sm font-bold text-white">
                  슬립 {slipIndex + 1} / {slipCount}
                </p>
                <p className="text-xs text-gray-400">
                  게임 {slipIndex * 5 + 1}~{Math.min((slipIndex + 1) * 5, sets.length)} 번
                  &nbsp;({sets.length}게임 전체)
                </p>
              </div>
              <button
                onClick={() => setSlipIndex(i => Math.min(slipCount - 1, i + 1))}
                disabled={slipIndex === slipCount - 1}
                className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* 슬립지 캔버스 — 가로 방향 */}
          <div style={{
            position: "relative",
            width:  PREVIEW_W,
            height: PREVIEW_H,
            background: "#fff",
            border: "2px solid #555",
            borderRadius: 3,
            boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
            flexShrink: 0,
            overflow: "hidden",
          }}>

            {/* 게임 구분 세로선 */}
            {GAMES.map((_, gi) => {
              if (gi === 0) return null;
              const lineX = toX(cal.startX + (gi - 0.5) * cal.gamePitch);
              return (
                <div key={`vline-${gi}`} style={{
                  position: "absolute",
                  top: 0, bottom: 0,
                  left: lineX,
                  width: 1,
                  background: "rgba(180,180,180,0.5)",
                }} />
              );
            })}

            {/* 모든 셀 */}
            {GAMES.map((_, gi) =>
              ALL_NUMS.map(num => {
                const { cx, cy } = cellPos(num, gi);
                const isSel = selected.has(`${gi}-${num}`);
                return (
                  <div key={`cell-${gi}-${num}`} style={{
                    position: "absolute",
                    left:   cx - cellWPx / 2,
                    top:    cy - cellHPx / 2,
                    width:  cellWPx,
                    height: cellHPx,
                    border: isSel
                      ? "1px solid rgba(220,38,38,0.7)"
                      : "0.5px solid rgba(140,140,140,0.3)",
                    background: isSel ? "rgba(254,226,226,0.6)" : "transparent",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    <span style={{
                      fontSize: 6,
                      color: isSel ? "rgba(185,0,0,0.9)" : "rgba(120,120,120,0.6)",
                      fontWeight: isSel ? 700 : 400,
                      lineHeight: 1,
                      userSelect: "none",
                    }}>{num}</span>
                  </div>
                );
              })
            )}

            {/* 선택 번호 마킹 타원 */}
            {currentSets.map((nums, gi) =>
              (nums ?? []).map(num => {
                const { cx, cy } = cellPos(num, gi);
                return (
                  <div key={`mark-${gi}-${num}`} style={{
                    position: "absolute",
                    left:         cx - markWPx / 2,
                    top:          cy - markHPx / 2,
                    width:        markWPx,
                    height:       markHPx,
                    background:   "rgba(10,10,10,0.88)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }} />
                );
              })
            )}

            {/* 게임 레이블 A~E */}
            {GAMES.map((g, gi) => {
              const lx = toX(cal.startX + gi * cal.gamePitch);
              const ly = Math.max(2, toY(cal.startY - 5));
              return (
                <div key={`lbl-${gi}`} style={{
                  position: "absolute",
                  left: lx, top: ly,
                  fontSize: 9, fontWeight: 800,
                  color: "rgba(200,0,0,0.8)",
                  lineHeight: 1, userSelect: "none",
                }}>{g}</div>
              );
            })}
          </div>

          {/* 사용 안내 */}
          <div className="bg-gray-800 rounded-xl p-3 max-w-lg w-full text-xs text-gray-300 space-y-1.5">
            <p className="font-bold text-amber-300 mb-1">📌 캘리브레이션 필수 순서</p>
            <p>① 슬립지를 <b className="text-white">세로(짧은 쪽 83mm가 수평)</b>로 프린터에 넣기</p>
            <p>② <b className="text-blue-300">테스트 인쇄</b> 클릭 → 격자+번호가 슬립에 인쇄됨</p>
            <p>③ 인쇄된 격자의 <b className="text-purple-300">번호 칸</b>이 슬립 실제 번호와 일치하는지 확인</p>
            <p className="ml-2 text-gray-400">· 칸이 너무 좁다 → <b className="text-purple-300">열 간격 ↑</b> / <b className="text-purple-300">행 간격 ↑</b></p>
            <p className="ml-2 text-gray-400">· 전체가 오른쪽으로 치우침 → <b className="text-blue-300">X 옵셋 ←</b></p>
            <p className="ml-2 text-gray-400">· 전체가 아래로 치우침 → <b className="text-blue-300">Y 옵셋 ↑</b></p>
            <p>④ 격자 일치 후 <b className="text-amber-300">저장</b> → <b className="text-amber-300">실제 인쇄</b></p>
          </div>
        </div>

        {/* 우측: 캘리브레이션 패널 */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">

            {/* ① 게임 간격 (가로) */}
            <div className="bg-green-50 rounded-xl p-3 mb-4 border border-green-200">
              <p className="text-xs font-bold text-green-800 mb-0.5">
                🎯 게임 간격 (가장 중요)
              </p>
              <p className="text-xs text-green-700 mb-3 leading-relaxed">
                D·E 게임이 <b>오른쪽</b>으로 밀린다 → 값을 <b>줄이세요</b>.<br/>
                D·E 게임이 <b>왼쪽</b>으로 당겨진다 → 값을 <b>늘리세요</b>.
              </p>
              <SliderRow
                label="게임 간격"
                hint="(A→B→C→D→E 가로 간격)"
                value={cal.gamePitch}
                min={10} max={35} step={0.25}
                accentColor="accent-green-600"
                onChange={v => update("gamePitch", v)}
              />
            </div>

            {/* ② 번호 격자 간격 */}
            <div className="bg-purple-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-purple-800 mb-0.5">🔢 번호 격자 간격</p>
              <p className="text-xs text-purple-700 mb-3 leading-relaxed">
                번호칸 위치가 맞지 않으면 여기서 조정. 테스트 인쇄 후 격자선과 슬립 번호칸을 비교하세요.
              </p>
              <SliderRow
                label="열 간격"
                hint="(1~7 수평 간격)"
                value={cal.colPitch}
                min={1.5} max={6} step={0.1}
                accentColor="accent-purple-600"
                onChange={v => update("colPitch", v)}
              />
              <div className="flex justify-between text-xs text-gray-400 -mt-3 mb-3 px-0.5">
                <span>← 좁게</span><span>넓게 →</span>
              </div>
              <SliderRow
                label="행 간격"
                hint="(행1~7 수직 간격)"
                value={cal.rowPitch}
                min={4} max={12} step={0.1}
                accentColor="accent-purple-600"
                onChange={v => update("rowPitch", v)}
              />
              <div className="flex justify-between text-xs text-gray-400 -mt-3 mb-1 px-0.5">
                <span>↑ 좁게</span><span>넓게 ↓</span>
              </div>
            </div>

            {/* ③ 시작 좌표 */}
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-blue-800 mb-0.5">📍 A-1번 마킹 중심 위치</p>
              <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                슬립지 왼쪽 끝·위쪽 끝에서 A게임 1번 칸 중심까지 실측한 거리를 입력하세요.
              </p>

              <SliderRow
                label="A-1번 X위치"
                hint="(좌끝→A-1중심)"
                value={cal.startX}
                min={0} max={30} step={0.25}
                onChange={v => update("startX", v)}
              />
              <div className="flex justify-between text-xs text-gray-400 -mt-3 mb-3 px-0.5">
                <span>← 왼쪽</span><span>오른쪽 →</span>
              </div>

              <SliderRow
                label="A-1번 Y위치"
                hint="(위끝→1행중심)"
                value={cal.startY}
                min={20} max={65} step={0.25}
                onChange={v => update("startY", v)}
              />
              <div className="flex justify-between text-xs text-gray-400 -mt-3 mb-1 px-0.5">
                <span>↑ 위</span><span>아래 ↓</span>
              </div>
            </div>

            {/* 현재 규격 */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-500 space-y-1">
              <p className="font-bold text-gray-600 mb-1">📐 현재 설정값</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span>슬립지 크기</span><span className="font-mono text-gray-700">190 × 83mm</span>
                <span>방향</span><span className="font-mono text-gray-700">세로 (Portrait)</span>
                <span>열 간격</span><span className="font-mono text-gray-700">{cal.colPitch.toFixed(2)}mm</span>
                <span>행 간격</span><span className="font-mono text-gray-700">{cal.rowPitch.toFixed(2)}mm</span>
                <span>게임 간격</span><span className="font-mono text-gray-700">{cal.gamePitch.toFixed(1)}mm</span>
                <span>A-1번 X위치</span><span className="font-mono text-gray-700">{cal.startX.toFixed(2)}mm</span>
                <span>A-1번 Y위치</span><span className="font-mono text-gray-700">{cal.startY.toFixed(2)}mm</span>
                <span>마킹 타원</span><span className="font-mono text-gray-700">2.5 × 4.5mm</span>
              </div>
            </div>

            {/* 선택 번호 요약 */}
            <div className="bg-amber-50 rounded-xl p-3 text-xs">
              <p className="font-bold text-amber-800 mb-1.5">
                🎯 선택 번호
                {slipCount > 1 && (
                  <span className="ml-1.5 font-normal text-amber-600">
                    (슬립 {slipIndex + 1}/{slipCount})
                  </span>
                )}
              </p>
              {GAMES.map((g, gi) => {
                const nums = currentSets[gi];
                if (!nums) return (
                  <div key={gi} className="flex gap-1 mb-1 items-center">
                    <span className="font-bold text-gray-400 w-5">{g}</span>
                    <span className="text-gray-400">—</span>
                  </div>
                );
                return (
                  <div key={gi} className="flex gap-1 mb-1 items-center flex-wrap">
                    <span className="font-bold text-red-600 w-5">{g}</span>
                    {[...nums].sort((a, b) => a - b).map(n => (
                      <span key={n} className="bg-red-100 text-red-700 font-bold rounded px-1 py-0.5 text-xs">
                        {n}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
            <button
              onClick={() => onPrint(cal)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />실제 인쇄
            </button>
            <button
              onClick={() => testPrintLotto(cal)}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Printer className="w-4 h-4 opacity-70" />테스트 인쇄 (격자만)
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className={`flex-1 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1 transition-colors ${
                  saved
                    ? "bg-green-500 text-white border-green-500"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Save className="w-3.5 h-3.5" />{saved ? "저장됨!" : "저장"}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />초기화
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
