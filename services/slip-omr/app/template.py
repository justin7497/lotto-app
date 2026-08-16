"""공식 동행복권 마킹 슬립 템플릿 (83×190mm, 세로 A~E)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator

SLIP_W_MM = 83.0
SLIP_H_MM = 190.0

WARP_W_PORTRAIT = 830
WARP_H_PORTRAIT = 1900
WARP_W_LANDSCAPE = 1900
WARP_H_LANDSCAPE = 830

GAME_LABELS = ("A", "B", "C", "D", "E")


@dataclass(frozen=True)
class OfficialSlipCal:
    """공식 슬립 실측 기반 (83×190mm, 830×1900px 워프 기준 역산)."""

    grid_left: float = 23.2
    header_height: float = 49.0
    game_block_h: float = 28.2
    grid_top_in_block: float = 11.0
    col_pitch: float = 8.1
    row_pitch: float = 3.1
    mark_w: float = 2.3
    mark_h: float = 2.1


DEFAULT_OFFICIAL_CAL = OfficialSlipCal()


def mm_to_px(
    x_mm: float,
    y_mm: float,
    slip_w_mm: float,
    slip_h_mm: float,
    img_w: int,
    img_h: int,
) -> tuple[float, float]:
    return (x_mm / slip_w_mm) * img_w, (y_mm / slip_h_mm) * img_h


def cell_mm(num: int, game_idx: int, cal: OfficialSlipCal = DEFAULT_OFFICIAL_CAL) -> tuple[float, float]:
    col = (num - 1) % 7
    row = (num - 1) // 7
    x = cal.grid_left + col * cal.col_pitch
    y = cal.header_height + game_idx * cal.game_block_h + cal.grid_top_in_block + row * cal.row_pitch
    return x, y


def expected_timing_rows(cal: OfficialSlipCal = DEFAULT_OFFICIAL_CAL) -> list[float]:
    """타이밍 마크가 정렬되는 행 중심 Y (mm)."""
    rows: list[float] = []
    for game_idx in range(5):
        for row in range(7):
            y = (
                cal.header_height
                + game_idx * cal.game_block_h
                + cal.grid_top_in_block
                + row * cal.row_pitch
                + cal.row_pitch / 2
            )
            rows.append(y)
    return rows


@dataclass(frozen=True)
class BubbleSpec:
    game: int
    number: int
    x: float
    y: float
    rx: float
    ry: float


def iter_bubbles(
    img_w: int,
    img_h: int,
    layout: str = "official_portrait",
    cal: OfficialSlipCal = DEFAULT_OFFICIAL_CAL,
    y_scale: float = 1.0,
    y_offset_px: float = 0.0,
) -> Iterator[BubbleSpec]:
    slip_w = SLIP_W_MM if layout == "official_portrait" else 190.0
    slip_h = SLIP_H_MM if layout == "official_portrait" else 83.0

    for game_idx in range(5):
        for num in range(1, 46):
            x_mm, y_mm = cell_mm(num, game_idx, cal)
            if layout == "custom_landscape":
                x_mm, y_mm = y_mm, x_mm
            x, y = mm_to_px(x_mm, y_mm, slip_w, slip_h, img_w, img_h)
            y = y * y_scale + y_offset_px
            rx = (cal.mark_w / slip_w) * img_w / 2
            ry = (cal.mark_h / slip_h) * img_h / 2
            yield BubbleSpec(game_idx, num, x, y, max(rx, 4), max(ry, 4))


def template_dict(cal: OfficialSlipCal = DEFAULT_OFFICIAL_CAL) -> dict:
    """OMRChecker 호환 참고용 메타데이터."""
    bubbles = []
    for game_idx, label in enumerate(GAME_LABELS):
        for num in range(1, 46):
            x_mm, y_mm = cell_mm(num, game_idx, cal)
            bubbles.append(
                {
                    "game": label,
                    "number": num,
                    "x_mm": round(x_mm, 3),
                    "y_mm": round(y_mm, 3),
                    "mark_w_mm": cal.mark_w,
                    "mark_h_mm": cal.mark_h,
                }
            )
    return {
        "name": "dhlottery_official_portrait",
        "slip_size_mm": {"width": SLIP_W_MM, "height": SLIP_H_MM},
        "warp_size_px": {"width": WARP_W_PORTRAIT, "height": WARP_H_PORTRAIT},
        "calibration": cal.__dict__,
        "timing_mark": {
            "side": "left",
            "strip_ratio": 0.1,
            "expected_rows_mm": expected_timing_rows(cal),
        },
        "bubbles": bubbles,
    }
