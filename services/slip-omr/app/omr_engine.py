"""슬립 OMR — 타이밍 마크 행 정렬 + 검은 볼펜 감지 (공식 세로 슬립)."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np

from app.template import (
    GAME_LABELS,
    WARP_H_LANDSCAPE,
    WARP_H_PORTRAIT,
    WARP_W_LANDSCAPE,
    WARP_W_PORTRAIT,
)

# 번호 격자 가로 범위 (워프 이미지 너비 대비)
GRID_X0_RATIO = 0.255
GRID_X1_RATIO = 0.945
EXPECTED_TIMING_ROWS = 35  # 5게임 × 7행
STRONG_MARK = 0.48
AUTO_TRUST_CONFIDENCE = 0.72


@dataclass
class BubbleReading:
    game: int
    number: int
    x: float
    y: float
    radius: float
    density: float
    filled: bool


@dataclass
class GameResult:
    label: str
    numbers: list[int]
    mode: str


@dataclass
class ScanResult:
    layout: str
    confidence: float
    games: list[GameResult]
    bubbles: list[BubbleReading]
    warped_jpeg_b64: str
    warp_width: int
    warp_height: int
    auto_filled: bool
    timing_rows: int


def _decode_image(image_b64: str) -> np.ndarray:
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]
    raw = base64.b64decode(image_b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("invalid_image")
    return img


def _dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def warp_with_quad(
    img: np.ndarray,
    quad: list[dict[str, float]],
    img_w: int,
    img_h: int,
) -> tuple[np.ndarray, int, int, bool]:
    pts = np.float32([[p["x"] * img_w, p["y"] * img_h] for p in quad])
    w_top = _dist(pts[0], pts[1])
    h_left = _dist(pts[0], pts[3])
    landscape = w_top >= h_left
    dst_w = WARP_W_LANDSCAPE if landscape else WARP_W_PORTRAIT
    dst_h = WARP_H_LANDSCAPE if landscape else WARP_H_PORTRAIT
    dst = np.float32([[0, 0], [dst_w, 0], [dst_w, dst_h], [0, dst_h]])
    matrix = cv2.getPerspectiveTransform(pts, dst)
    warped = cv2.warpPerspective(img, matrix, (dst_w, dst_h))
    return warped, dst_w, dst_h, landscape


def _find_timing_rows(gray: np.ndarray) -> list[float]:
    """왼쪽 검은 타이밍 마크 중심 Y 좌표."""
    h, w = gray.shape[:2]
    sw = max(14, int(w * 0.12))
    strip = gray[:, :sw]
    blur = cv2.GaussianBlur(strip, (3, 3), 0)
    _, bw = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 7))
    bw = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rows: list[float] = []
    min_h = max(5, h * 0.007)
    max_h = h * 0.028
    for c in contours:
        _x, y, cw, ch = cv2.boundingRect(c)
        if ch < min_h or ch > max_h:
            continue
        if cw < sw * 0.2:
            continue
        rows.append(y + ch * 0.5)

    rows.sort()
    merged: list[float] = []
    for cy in rows:
        if merged and cy - merged[-1] < 8:
            merged[-1] = (merged[-1] + cy) / 2
        else:
            merged.append(cy)
    return merged


def _normalize_timing_rows(rows: list[float], h: float) -> list[float]:
    if len(rows) < 28:
        return []
    if len(rows) == EXPECTED_TIMING_ROWS:
        return rows

    gaps = [rows[i + 1] - rows[i] for i in range(len(rows) - 1)]
    med_gap = float(np.median(gaps)) if gaps else h / EXPECTED_TIMING_ROWS

    kept = [rows[0]]
    for cy in rows[1:]:
        if cy - kept[-1] >= med_gap * 0.5:
            kept.append(cy)
    rows = kept

    if len(rows) < 28:
        return []

    if len(rows) > EXPECTED_TIMING_ROWS:
        idx = np.linspace(0, len(rows) - 1, EXPECTED_TIMING_ROWS)
        rows = [rows[int(round(i))] for i in idx]

    if len(rows) < EXPECTED_TIMING_ROWS:
        return []

    return rows[:EXPECTED_TIMING_ROWS]


def _default_col_centers(w: int) -> list[float]:
    x0 = w * GRID_X0_RATIO
    x1 = w * GRID_X1_RATIO
    pitch = (x1 - x0) / 7
    return [x0 + (i + 0.5) * pitch for i in range(7)]


def _detect_col_centers(bgr: np.ndarray, row_ys: list[float]) -> list[float]:
    """빨간 세로 격자선으로 열 중심 추정."""
    h, w = bgr.shape[:2]
    if len(row_ys) < 7:
        return _default_col_centers(w)

    y0 = int(max(0, min(row_ys[:7]) - h * 0.01))
    y1 = int(min(h, max(row_ys[:7]) + h * 0.01))
    x0 = int(w * 0.22)
    x1 = int(w * 0.96)
    roi = bgr[y0:y1, x0:x1]
    if roi.size == 0:
        return _default_col_centers(w)

    blue, green, red = cv2.split(roi)
    red_mask = (
        (red.astype(np.int16) > 115)
        & (red.astype(np.int16) - green.astype(np.int16) > 14)
        & (red.astype(np.int16) - blue.astype(np.int16) > 14)
    ).astype(np.uint8) * 255
    proj = red_mask.sum(axis=0).astype(np.float32)
    if proj.max() < 10:
        return _default_col_centers(w)

    smooth = cv2.GaussianBlur(proj.reshape(1, -1), (0, 0), 3).flatten()
    thresh = float(np.percentile(smooth, 70))
    peaks: list[int] = []
    for i in range(2, len(smooth) - 2):
        if smooth[i] >= thresh and smooth[i] >= smooth[i - 1] and smooth[i] >= smooth[i + 1]:
            if not peaks or i - peaks[-1] > 8:
                peaks.append(i)

    if len(peaks) < 6:
        return _default_col_centers(w)

    # 세로선 사이 중심 = 열 중심
    line_x = [x0 + p for p in peaks]
    centers: list[float] = []
    for i in range(len(line_x) - 1):
        centers.append((line_x[i] + line_x[i + 1]) / 2)
    if len(centers) >= 7:
        return centers[:7]
    return _default_col_centers(w)


def _ellipse_mask(
    shape: tuple[int, int],
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    x0: int,
    y0: int,
) -> np.ndarray:
    hh, ww = shape
    yy, xx = np.ogrid[y0 : y0 + hh, x0 : x0 + ww]
    return ((xx - cx) / max(rx, 1)) ** 2 + ((yy - cy) / max(ry, 1)) ** 2 <= 0.78


def _black_ink_score(bgr: np.ndarray, cx: float, cy: float, rx: float, ry: float) -> float:
    h, w = bgr.shape[:2]
    x0 = max(0, int(cx - rx - 2))
    x1 = min(w, int(cx + rx + 3))
    y0 = max(0, int(cy - ry - 2))
    y1 = min(h, int(cy + ry + 3))
    if x1 <= x0 or y1 <= y0:
        return 0.0

    patch = bgr[y0:y1, x0:x1]
    mask = _ellipse_mask(patch.shape[:2], cx, cy, rx, ry, x0, y0)
    if not mask.any():
        return 0.0

    blue = patch[:, :, 0].astype(np.int16)
    green = patch[:, :, 1].astype(np.int16)
    red = patch[:, :, 2].astype(np.int16)
    gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY).astype(np.int16)

    red_print = (red > 100) & (red - green > 16) & (red - blue > 16)
    black_ink = (gray < 92) & (blue < 105) & (green < 105) & (~red_print)
    score_map = np.where(black_ink, 1.0, 0.0).astype(np.float32)
    return float(score_map[mask].mean())


def _pick_game_numbers(readings: list[tuple[int, float]]) -> tuple[list[int], float]:
    if not readings:
        return [], 0.0
    ordered = sorted(readings, key=lambda r: r[1], reverse=True)
    scores = [d for _, d in ordered]
    top = scores[0]
    if top < STRONG_MARK:
        return [], top

    median = float(np.median(scores))
    floor = max(STRONG_MARK, median + 0.38, top * 0.58)
    picked: list[int] = []
    for num, density in ordered:
        if density < floor:
            break
        if len(picked) >= 6:
            break
        if picked and density < top * 0.5:
            break
        picked.append(num)
    return sorted(picked), top


def _scan_portrait(bgr: np.ndarray) -> tuple[list[BubbleReading], list[GameResult], float, int, bool]:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]

    raw_rows = _find_timing_rows(gray)
    row_ys = _normalize_timing_rows(raw_rows, float(h))
    if len(row_ys) < EXPECTED_TIMING_ROWS:
        raise ValueError("timing_marks")

    col_centers = _detect_col_centers(bgr, row_ys)
    col_pitch = (col_centers[-1] - col_centers[0]) / 6 if len(col_centers) > 1 else w * 0.09
    rx = max(6.0, col_pitch * 0.22)
    ry = max(5.0, (row_ys[1] - row_ys[0]) * 0.28 if len(row_ys) > 1 else h * 0.012)

    bubble_readings: list[BubbleReading] = []
    per_game: list[list[tuple[int, float]]] = [[] for _ in range(5)]

    for gi in range(5):
        for ri in range(7):
            y = row_ys[gi * 7 + ri]
            num_base = ri * 7 + 1
            for ci, cx in enumerate(col_centers):
                num = num_base + ci
                if num > 45:
                    continue
                density = _black_ink_score(bgr, cx, y, rx, ry)
                bubble_readings.append(
                    BubbleReading(
                        game=gi,
                        number=num,
                        x=round(cx, 1),
                        y=round(y, 1),
                        radius=round((rx + ry) / 2, 1),
                        density=round(density, 4),
                        filled=False,
                    )
                )
                per_game[gi].append((num, density))

    games: list[GameResult] = []
    peaks: list[float] = []
    marked_total = 0
    six_count = 0
    active_games = 0

    for gi, label in enumerate(GAME_LABELS):
        numbers, peak = _pick_game_numbers(per_game[gi])
        peaks.append(peak)
        if numbers:
            marked_total += len(numbers)
            active_games += 1
        if len(numbers) == 6:
            six_count += 1
        games.append(GameResult(label=label, numbers=numbers, mode="A" if not numbers else "M"))

    if marked_total == 0:
        raise ValueError("no_marks")

    avg_peak = float(np.mean([p for p in peaks if p > 0]) or 0.0)
    confidence = min(
        0.9,
        avg_peak * 0.55
        + (six_count / max(active_games, 1)) * 0.25
        + (marked_total / max(active_games * 6, 1)) * 0.1,
    )

    # 자동 선택은 매우 보수적으로 — 틀린 번호를 채우지 않음
    auto_filled = (
        confidence >= AUTO_TRUST_CONFIDENCE
        and active_games == 1
        and six_count == 1
        and avg_peak >= 0.58
    )

    filled_set: set[tuple[int, int]] = set()
    if auto_filled:
        for gi, g in enumerate(games):
            for n in g.numbers:
                filled_set.add((gi, n))

    for b in bubble_readings:
        b.filled = (b.game, b.number) in filled_set

    return bubble_readings, games, confidence, len(row_ys), auto_filled


def _encode_jpeg(img: np.ndarray, quality: int = 82) -> str:
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise ValueError("encode_failed")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def scan_slip_image(
    image_b64: str,
    quad: list[dict[str, float]] | None,
    width: int,
    height: int,
) -> ScanResult:
    img = _decode_image(image_b64)
    if quad and len(quad) == 4:
        warped, warp_w, warp_h, landscape = warp_with_quad(img, quad, width, height)
    else:
        warped = img
        warp_h, warp_w = img.shape[:2]
        landscape = warp_w > warp_h * 1.1

    if landscape:
        raise ValueError("landscape_unsupported")

    bubble_readings, games, confidence, timing_count, auto_filled = _scan_portrait(warped)

    preview = warped.copy()
    for b in bubble_readings:
        if not b.filled:
            continue
        cv2.circle(preview, (int(b.x), int(b.y)), int(b.radius), (0, 0, 255), 2)

    return ScanResult(
        layout="official_portrait",
        confidence=round(confidence, 4),
        games=games,
        bubbles=bubble_readings,
        warped_jpeg_b64=_encode_jpeg(preview),
        warp_width=warp_w,
        warp_height=warp_h,
        auto_filled=auto_filled,
        timing_rows=timing_count,
    )


def scan_result_to_json(result: ScanResult) -> dict[str, Any]:
    return {
        "ok": True,
        "layout": result.layout,
        "confidence": result.confidence,
        "autoFilled": result.auto_filled,
        "timingRows": result.timing_rows,
        "games": [
            {"label": g.label, "numbers": g.numbers, "mode": g.mode} for g in result.games
        ],
        "bubbles": [
            {
                "game": b.game,
                "number": b.number,
                "x": b.x,
                "y": b.y,
                "radius": b.radius,
                "filled": b.filled,
                "density": b.density,
            }
            for b in result.bubbles
        ],
        "warpedImage": f"data:image/jpeg;base64,{result.warped_jpeg_b64}",
        "warpWidth": result.warp_width,
        "warpHeight": result.warp_height,
        "engine": "slip-omr/2.0",
    }
