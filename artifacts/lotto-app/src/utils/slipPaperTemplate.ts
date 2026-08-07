/**
 * 로또 슬립지 형상 템플릿 — 격자 패턴 생성 · 이미지 내 위치 매칭
 */
import {
  cellMm,
  loadCalibration,
  MARK_H,
  MARK_W,
  SLIP_H,
  SLIP_W,
  type PrintCalibration,
} from "@/utils/printCalibration";

type Point = { x: number; y: number };

const REF_W = 380;
const REF_H = Math.round(REF_W * (SLIP_H / SLIP_W));

function toGrayscale(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    out[i] = Math.round(0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]);
  }
  return out;
}

export interface SlipTemplateMatch {
  quad: Point[];
  score: number;
  scale: number;
  source: "builtin" | "saved";
}

export interface SavedSlipReference {
  edges: Uint8Array;
  width: number;
  height: number;
  savedAt: number;
}

const LS_REF_KEY = "lotto_slip_shape_ref_v1";

let cachedBuiltin: { edges: Uint8Array; width: number; height: number } | null = null;

function sobelEdges(gray: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] -
        2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] -
        gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] -
        2 * gray[(y - 1) * w + x] -
        gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];
      out[y * w + x] = Math.min(255, Math.hypot(gx, gy));
    }
  }
  return out;
}

/** 슬립지 격자 구조를 그린 참조 엣지 맵 (앱 내장) */
export function buildBuiltinSlipTemplate(
  cal: PrintCalibration = loadCalibration(),
): { edges: Uint8Array; width: number; height: number } {
  if (cachedBuiltin) return cachedBuiltin;

  const canvas = document.createElement("canvas");
  canvas.width = REF_W;
  canvas.height = REF_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { edges: new Uint8Array(REF_W * REF_H), width: REF_W, height: REF_H };
  }

  const sx = REF_W / SLIP_W;
  const sy = REF_H / SLIP_H;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, REF_W, REF_H);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(1.5, 1.5, REF_W - 3, REF_H - 3);

  for (let gi = 0; gi < 5; gi++) {
    for (let num = 1; num <= 45; num++) {
      const { x, y } = cellMm(num, gi, cal);
      const cx = x * sx;
      const cy = y * sy;
      const rx = (MARK_W / 2) * sx;
      const ry = (MARK_H / 2) * sy;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1.5), Math.max(ry, 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const gray = toGrayscale(ctx.getImageData(0, 0, REF_W, REF_H).data, REF_W, REF_H);
  const edges = sobelEdges(gray, REF_W, REF_H);
  cachedBuiltin = { edges, width: REF_W, height: REF_H };
  return cachedBuiltin;
}

function resizeGrayNearest(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const out = new Uint8Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y / dstH) * srcH));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x / dstW) * srcW));
      out[y * dstW + x] = src[sy * srcW + sx];
    }
  }
  return out;
}

function patchScore(
  image: Uint8Array,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  tpl: Uint8Array,
  tplW: number,
  tplH: number,
): number {
  let sum = 0;
  let count = 0;
  const step = 2;
  for (let ty = 0; ty < tplH; ty += step) {
    const iy = y + ty;
    if (iy < 0 || iy >= imgH) continue;
    for (let tx = 0; tx < tplW; tx += step) {
      const ix = x + tx;
      if (ix < 0 || ix >= imgW) continue;
      const t = tpl[ty * tplW + tx];
      if (t < 18) continue;
      const diff = Math.abs(image[iy * imgW + ix] - t);
      sum += 255 - diff;
      count++;
    }
  }
  return count > 40 ? sum / count : 0;
}

function matchAtScale(
  imageEdges: Uint8Array,
  imgW: number,
  imgH: number,
  tpl: Uint8Array,
  tplW: number,
  tplH: number,
  scale: number,
): { x: number; y: number; score: number; tw: number; th: number } | null {
  const tw = Math.max(24, Math.round(tplW * scale));
  const th = Math.max(12, Math.round(tplH * scale));
  if (tw >= imgW - 4 || th >= imgH - 4) return null;

  const scaledTpl = resizeGrayNearest(tpl, tplW, tplH, tw, th);
  const step = Math.max(4, Math.floor(Math.min(imgW, imgH) / 80));

  let best = { x: 0, y: 0, score: 0, tw, th };
  for (let y = 0; y <= imgH - th; y += step) {
    for (let x = 0; x <= imgW - tw; x += step) {
      const score = patchScore(imageEdges, imgW, imgH, x, y, scaledTpl, tw, th);
      if (score > best.score) best = { x, y, score, tw, th };
    }
  }

  if (best.score < 120) return null;

  for (let y = Math.max(0, best.y - step); y <= Math.min(imgH - th, best.y + step); y++) {
    for (let x = Math.max(0, best.x - step); x <= Math.min(imgW - tw, best.x + step); x++) {
      const score = patchScore(imageEdges, imgW, imgH, x, y, scaledTpl, tw, th);
      if (score > best.score) best = { x, y, score, tw, th };
    }
  }

  return best.score >= 120 ? best : null;
}

function quadFromRect(x: number, y: number, w: number, h: number, imgW: number, imgH: number): Point[] {
  const sx = imgW / REF_W;
  const sy = imgH / REF_H;
  const x0 = x / sx;
  const y0 = y / sy;
  const x1 = (x + w) / sx;
  const y1 = (y + h) / sy;
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

function matchTemplateInEdges(
  imageEdges: Uint8Array,
  imgW: number,
  imgH: number,
  tpl: Uint8Array,
  tplW: number,
  tplH: number,
  source: "builtin" | "saved",
): SlipTemplateMatch | null {
  const scales = [0.22, 0.32, 0.42, 0.55, 0.68, 0.82];
  let best: (SlipTemplateMatch & { tw: number; th: number; x: number; y: number }) | null = null;

  for (const scale of scales) {
    const hit = matchAtScale(imageEdges, imgW, imgH, tpl, tplW, tplH, scale);
    if (!hit || hit.score < 120) continue;
    const quad = quadFromRect(hit.x, hit.y, hit.tw, hit.th, imgW, imgH);
    if (!best || hit.score > best.score) {
      best = { quad, score: hit.score, scale, source, tw: hit.tw, th: hit.th, x: hit.x, y: hit.y };
    }
  }

  if (!best) return null;
  return { quad: best.quad, score: best.score, scale: best.scale, source: best.source };
}

/** 촬영/저장용 — 엣지 맵을 참조로 저장 */
export function saveSlipReferenceFromGray(gray: Uint8Array, w: number, h: number): SavedSlipReference {
  const small =
    w === REF_W && h === REF_H ? gray : resizeGrayNearest(gray, w, h, REF_W, REF_H);
  const edges = sobelEdges(small, REF_W, REF_H);
  const ref: SavedSlipReference = { edges, width: REF_W, height: REF_H, savedAt: Date.now() };
  try {
    const payload = {
      width: REF_W,
      height: REF_H,
      savedAt: ref.savedAt,
      edges: Array.from(edges),
    };
    localStorage.setItem(LS_REF_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
  return ref;
}

export function loadSavedSlipReference(): SavedSlipReference | null {
  try {
    const raw = localStorage.getItem(LS_REF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      width: number;
      height: number;
      savedAt: number;
      edges: number[];
    };
    if (!parsed.edges?.length) return null;
    return {
      width: parsed.width,
      height: parsed.height,
      savedAt: parsed.savedAt,
      edges: Uint8Array.from(parsed.edges),
    };
  } catch {
    return null;
  }
}

export function clearSavedSlipReference(): void {
  localStorage.removeItem(LS_REF_KEY);
}

/** 그레이스케일 이미지에서 슬립지 형상 매칭 → 4꼭짓점 */
export function findSlipByTemplate(
  gray: Uint8Array,
  imgW: number,
  imgH: number,
  cal: PrintCalibration = loadCalibration(),
): SlipTemplateMatch | null {
  const maxSide = 520;
  const scaleDown = Math.min(1, maxSide / Math.max(imgW, imgH));
  const sw = Math.max(1, Math.round(imgW * scaleDown));
  const sh = Math.max(1, Math.round(imgH * scaleDown));
  const small =
    scaleDown < 1 ? resizeGrayNearest(gray, imgW, imgH, sw, sh) : gray;
  const edges = sobelEdges(small, sw, sh);

  const builtin = buildBuiltinSlipTemplate(cal);
  const builtinHit = matchTemplateInEdges(
    edges,
    sw,
    sh,
    builtin.edges,
    builtin.width,
    builtin.height,
    "builtin",
  );

  const saved = loadSavedSlipReference();
  let savedHit: SlipTemplateMatch | null = null;
  if (saved) {
    const savedSmall = resizeGrayNearest(saved.edges, saved.width, saved.height, REF_W, REF_H);
    savedHit = matchTemplateInEdges(edges, sw, sh, savedSmall, REF_W, REF_H, "saved");
  }

  if (builtinHit && savedHit) {
    return builtinHit.score >= savedHit.score ? builtinHit : savedHit;
  }
  return builtinHit ?? savedHit;
}
