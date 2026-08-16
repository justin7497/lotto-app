"""슬립 OMR Cloud Run API."""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.omr_engine import scan_result_to_json, scan_slip_image
from app.template import template_dict

app = FastAPI(title="Slip OMR", version="1.0.0")

allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class QuadPoint(BaseModel):
    x: float
    y: float


class ScanRequest(BaseModel):
    image: str = Field(..., description="data URL or base64 JPEG/PNG")
    quad: list[QuadPoint] | None = None
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/template")
def get_template() -> dict[str, Any]:
    return template_dict()


@app.post("/scan")
def scan(body: ScanRequest) -> dict[str, Any]:
    quad = [{"x": p.x, "y": p.y} for p in body.quad] if body.quad else None
    try:
        result = scan_slip_image(body.image, quad, body.width, body.height)
        return scan_result_to_json(result)
    except ValueError as exc:
        code = str(exc)
        message = {
            "invalid_image": "이미지를 읽을 수 없습니다.",
            "no_marks": "마킹된 번호를 찾지 못했습니다. 검은 볼펜으로 칸을 꽉 채워 주세요.",
            "timing_marks": "슬립 왼쪽 눈금이 보이도록 다시 맞춰 주세요.",
            "landscape_unsupported": "세로 슬립지를 촬영해 주세요.",
            "noise_grid": "격자가 맞지 않습니다. 영역을 다시 맞춰 주세요.",
        }.get(code, "인식에 실패했습니다.")
        return JSONResponse(
            status_code=422,
            content={"ok": False, "code": code, "message": message},
        )
