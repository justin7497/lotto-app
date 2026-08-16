import { createRequire } from "node:module";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const QRCode = require("../artifacts/lotto-app/node_modules/qrcode");

const OUT_DIR = resolve("artifacts/lotto-app/play-store");
const PHOTO_DIR = resolve("artifacts/lotto-app/play-store/photos");
const APP_URL = "https://lotto-app-ljh.web.app";
const WIDTH = 2480;
const HEIGHT = 3508;

const FONT = "Malgun Gothic, Apple SD Gothic Neo, sans-serif";
const TEAL = "#127a6e";
const TEAL_DARK = "#0d5c52";
const TEAL_LIGHT = "#e8f7f4";

const PHOTOS = {
  hero: "KakaoTalk_20260805_221747797_06.jpg",
  gallery: [
    "KakaoTalk_20260805_221747797_05.jpg",
    "KakaoTalk_20260805_221747797_04.jpg",
    "KakaoTalk_20260805_221747797_03.jpg",
    "KakaoTalk_20260805_221747797_02.jpg",
    "KakaoTalk_20260805_221747797.jpg",
  ],
  app: "KakaoTalk_20260805_221747797_01.jpg",
};

function esc(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textEl(x, y, content, opts = {}) {
  const {
    size = 32,
    weight = 600,
    fill = "#163b36",
    anchor = "start",
    opacity = 1,
  } = opts;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" opacity="${opacity}" font-family="${FONT}" font-size="${size}" font-weight="${weight}">${esc(content)}</text>`;
}

function featureBlock(x, y, num, title, desc) {
  return `
    <g transform="translate(${x}, ${y})">
      <circle cx="28" cy="28" r="28" fill="${TEAL}"/>
      <text x="28" y="36" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="28" font-weight="800">${num}</text>
      <rect x="72" y="4" width="700" height="88" rx="16" fill="#fff" stroke="#dbe7e3" stroke-width="2"/>
      ${textEl(96, 38, title, { size: 32, weight: 800, fill: TEAL_DARK })}
      ${textEl(96, 72, desc, { size: 24, weight: 600, fill: "#4b6f69" })}
    </g>`;
}

function stepBlock(x, y, num, text) {
  return `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="56" height="56" rx="14" fill="${TEAL_LIGHT}" stroke="${TEAL}" stroke-width="2"/>
      <text x="28" y="38" text-anchor="middle" fill="${TEAL}" font-family="${FONT}" font-size="28" font-weight="800">${num}</text>
      ${textEl(76, 38, text, { size: 28, weight: 700, fill: "#163b36" })}
    </g>`;
}

function roundedMask(width, height, radius) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/></svg>`,
  );
}

async function trimScreenshot(inputPath) {
  const meta = await sharp(inputPath).rotate().metadata();
  const top = Math.round(meta.height * 0.055);
  const bottom = Math.round(meta.height * 0.03);
  return sharp(inputPath)
    .rotate()
    .extract({
      left: 0,
      top,
      width: meta.width,
      height: meta.height - top - bottom,
    });
}

async function preparePhoto(inputPath, width, height, opts = {}) {
  const {
    radius = 28,
    brightness = 1.04,
    saturation = 1.1,
    position = "centre",
    screenshot = true,
  } = opts;

  const source = screenshot ? await trimScreenshot(inputPath) : sharp(inputPath).rotate();
  const processed = await source
    .resize(width, height, { fit: "cover", position })
    .modulate({ brightness, saturation })
    .normalize()
    .sharpen({ sigma: 0.7 })
    .png()
    .toBuffer();

  return sharp(processed)
    .composite([{ input: roundedMask(width, height, radius), blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function photoShadow(width, height, radius, offsetY = 10) {
  const pad = 24;
  const canvasW = width + pad * 2;
  const canvasH = height + pad * 2 + offsetY;
  const shadow = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 13, g: 92, b: 82, alpha: 0.22 },
    },
  })
    .blur(18)
    .composite([{ input: roundedMask(width, height, radius), blend: "dest-in" }])
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadow, left: pad, top: pad + offsetY },
    ])
    .png()
    .toBuffer();
}

async function framedPhoto(inputPath, width, height, opts = {}) {
  const radius = opts.radius ?? 28;
  const photo = await preparePhoto(inputPath, width, height, opts);
  const shadowPlate = await photoShadow(width, height, radius);
  const pad = 24;
  const frame = await sharp(shadowPlate)
    .composite([{ input: photo, left: pad, top: pad }])
    .png()
    .toBuffer();

  return { buffer: frame, leftOffset: pad, topOffset: pad };
}

function buildSvg() {
  const features = [
    ["모바일 QR 슬립지", "번호를 담아 판매점 단말기용 QR 생성 · 발급완료 확정"],
    ["복권 QR 당첨 확인", "구매 복권 QR 스캔으로 당첨 여부·번호 즉시 저장"],
    ["번호 만들기", "패턴·사주·8추천·직접 선택으로 나만의 번호 생성"],
    ["로또 전광판", "QR 인쇄 확정 번호만 모아 등수별 당첨 현황 확인"],
    ["나의 로또번호", "회차별 저장·관리 · 티켓 QR 불러오기"],
    ["분석 및 설정", "번호 통계·공뽑기·실수령액 계산·추첨 알림"],
  ];

  const steps = [
    "번호 만들기에서 번호를 고르고 저장합니다",
    "모바일 슬립지에서 QR을 생성합니다",
    "판매점 출력 후 「발급완료」를 누릅니다",
    "QR 당첨 확인 또는 전광판에서 결과를 봅니다",
  ];

  const featureSvg = features
    .map((f, i) => featureBlock(120, 1680 + i * 104, i + 1, f[0], f[1]))
    .join("");

  const stepSvg = steps
    .map((s, i) => stepBlock(1320, 1700 + i * 92, i + 1, s))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="hero" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#158f80"/>
      <stop offset="55%" stop-color="#127a6e"/>
      <stop offset="100%" stop-color="#0d5c52"/>
    </linearGradient>
    <linearGradient id="pageBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4fbf8"/>
      <stop offset="100%" stop-color="#e3f3ee"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#pageBg)"/>
  <circle cx="2200" cy="280" r="220" fill="${TEAL}" opacity="0.06"/>
  <circle cx="180" cy="3200" r="260" fill="${TEAL}" opacity="0.05"/>

  <!-- Header -->
  <rect x="0" y="0" width="${WIDTH}" height="260" fill="url(#hero)"/>
  ${textEl(120, 120, "소원로또", { size: 84, weight: 900, fill: "#fff" })}
  ${textEl(120, 200, "종이 슬립 없이, 스마트폰 하나로 로또까지", { size: 42, weight: 700, fill: "#dff5f0" })}
  <rect x="1680" y="88" width="380" height="64" rx="32" fill="#ffffff" fill-opacity="0.18" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  ${textEl(1870, 130, "회원가입 없이 바로 사용", { size: 28, weight: 800, fill: "#fff", anchor: "middle" })}

  <!-- Photo captions -->
  ${textEl(120, 300, "앱 미리보기", { size: 34, weight: 800, fill: TEAL_DARK })}
  ${textEl(120, 1540, "QR 슬립 · 번호 만들기 · 당첨 확인까지 한곳에서", { size: 34, weight: 800, fill: TEAL_DARK })}

  <!-- Recommend -->
  <rect x="120" y="1560" width="2240" height="72" rx="20" fill="#fff" stroke="#dbe7e3" stroke-width="2"/>
  ${textEl(180, 1610, "번호 고민 · 슬립 작성 · 당첨 확인을 한곳에서  |  판매점 QR 슬립 · 복권 당첨 확인 · 나만의 번호 저장", { size: 26, weight: 700, fill: "#4b6f69" })}

  ${textEl(120, 1660, "주요 기능", { size: 38, weight: 800, fill: TEAL_DARK })}
  ${textEl(1320, 1660, "이렇게 사용해요", { size: 38, weight: 800, fill: TEAL_DARK })}
  ${featureSvg}
  ${stepSvg}

  <!-- QR area -->
  <rect x="1320" y="2080" width="1040" height="500" rx="28" fill="#fff" stroke="#dbe7e3" stroke-width="2"/>
  ${textEl(1840, 2150, "지금 바로 접속", { size: 36, weight: 800, fill: TEAL_DARK, anchor: "middle" })}
  ${textEl(1840, 2200, APP_URL, { size: 26, weight: 700, fill: "#4b6f69", anchor: "middle" })}
  <rect id="qr-slot" x="1560" y="2220" width="280" height="280" rx="20" fill="${TEAL_LIGHT}" stroke="${TEAL}" stroke-width="2" stroke-dasharray="8 8"/>

  <!-- App preview label -->
  <!-- Footer -->
  <rect x="120" y="2620" width="2240" height="780" rx="28" fill="#fff" stroke="#dbe7e3" stroke-width="2"/>
  ${textEl(180, 2700, "알아두세요", { size: 34, weight: 800, fill: TEAL_DARK })}
  ${textEl(180, 2755, "• 만 19세 미만은 로또 구매 및 관련 서비스 이용이 제한될 수 있습니다.", { size: 24, weight: 600, fill: "#4b6f69" })}
  ${textEl(180, 2800, "• 소원로또는 동행복권 공식 앱이 아닌 보조 서비스입니다.", { size: 24, weight: 600, fill: "#4b6f69" })}
  ${textEl(180, 2845, "• QR 슬립은 단말기 전송용 보조 수단이며, 판매점·단말기 환경에 따라 사용 가능 여부가 달라질 수 있습니다.", { size: 24, weight: 600, fill: "#4b6f69" })}
  ${textEl(180, 2890, "• 저장 번호·슬립지 데이터는 주로 이용자 기기에 저장됩니다.", { size: 24, weight: 600, fill: "#4b6f69" })}
  ${textEl(180, 2980, "문의  contact@heartlinktoday.com", { size: 28, weight: 700, fill: TEAL })}
  <rect x="180" y="3040" width="2120" height="300" rx="24" fill="${TEAL_LIGHT}"/>
  ${textEl(1240, 3120, "소원로또와 함께, 더 편한 로또 라이프", { size: 46, weight: 900, fill: TEAL_DARK, anchor: "middle" })}
  ${textEl(1240, 3190, "QR 슬립  ·  당첨 확인  ·  번호 관리  ·  전광판", { size: 30, weight: 700, fill: "#4b6f69", anchor: "middle" })}
  ${textEl(1240, 3255, APP_URL, { size: 28, weight: 700, fill: TEAL, anchor: "middle" })}
</svg>`;
}

async function buildPhotoLayers() {
  const layers = [];
  const margin = 100;
  const gap = 20;

  const heroW = WIDTH - margin * 2;
  const heroH = 720;
  const heroPath = join(PHOTO_DIR, PHOTOS.hero);
  const heroPhoto = await preparePhoto(heroPath, heroW, heroH, {
    radius: 32,
    position: "attention",
  });
  const heroShadow = await photoShadow(heroW, heroH, 32, 14);
  const heroPad = 24;
  layers.push({
    input: heroShadow,
    left: margin - heroPad,
    top: 320 - heroPad,
  });
  layers.push({
    input: heroPhoto,
    left: margin,
    top: 320,
  });

  const heroOverlay = Buffer.from(`<svg width="${heroW}" height="${heroH}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="45%" stop-color="#0d5c52" stop-opacity="0"/>
        <stop offset="100%" stop-color="#0d5c52" stop-opacity="0.78"/>
      </linearGradient>
    </defs>
    <rect width="${heroW}" height="${heroH}" rx="32" ry="32" fill="url(#g)"/>
    <text x="48" y="${heroH - 92}" font-family="${FONT}" font-size="52" font-weight="900" fill="#ffffff">로또의 모든 것, 한 앱에서</text>
    <text x="48" y="${heroH - 36}" font-family="${FONT}" font-size="30" font-weight="700" fill="#dff5f0">QR 슬립 · 당첨 확인 · 번호 관리 · 전광판</text>
  </svg>`);
  layers.push({
    input: await sharp(heroOverlay).png().toBuffer(),
    left: margin,
    top: 320,
  });

  const insetW = 300;
  const insetH = 600;
  const insetPath = join(PHOTO_DIR, PHOTOS.app);
  const insetPhoto = await preparePhoto(insetPath, insetW, insetH, {
    radius: 24,
    position: "top",
  });
  const insetFrameW = insetW + 24;
  const insetFrameH = insetH + 24;
  const insetFrame = Buffer.from(`<svg width="${insetFrameW}" height="${insetFrameH}">
    <rect x="0" y="0" width="${insetFrameW}" height="${insetFrameH}" rx="34" fill="#ffffff" fill-opacity="0.95"/>
    <rect x="8" y="8" width="${insetFrameW - 16}" height="${insetFrameH - 16}" rx="28" fill="#163b36"/>
    <rect x="16" y="16" width="${insetW}" height="${insetH}" rx="22" fill="#ffffff"/>
  </svg>`);
  const insetComposite = await sharp(insetFrame)
    .composite([{ input: insetPhoto, left: 16, top: 16 }])
    .png()
    .toBuffer();
  const insetX = margin + heroW - insetFrameW - 36;
  const insetY = 320 + heroH - insetFrameH - 28;
  layers.push({ input: insetComposite, left: insetX, top: insetY });

  const insetLabel = Buffer.from(`<svg width="${insetFrameW}" height="48">
    <text x="${insetFrameW / 2}" y="34" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="800" fill="#0d5c52">나의 소원</text>
  </svg>`);
  layers.push({
    input: await sharp(insetLabel).png().toBuffer(),
    left: insetX,
    top: insetY - 8,
  });

  const galleryY = 1080;
  const galleryH = 420;
  const galleryW = WIDTH - margin * 2;
  const tileW = Math.floor((galleryW - gap * 4) / 5);
  for (let i = 0; i < PHOTOS.gallery.length; i += 1) {
    const path = join(PHOTO_DIR, PHOTOS.gallery[i]);
    const { buffer, leftOffset, topOffset } = await framedPhoto(path, tileW, galleryH, {
      radius: 22,
      position: i % 2 === 0 ? "centre" : "top",
    });
    const x = margin + i * (tileW + gap) - leftOffset;
    layers.push({
      input: buffer,
      left: x,
      top: galleryY - topOffset,
    });
  }

  return layers;
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PHOTO_DIR, { recursive: true });

const missing = [PHOTOS.hero, ...PHOTOS.gallery, PHOTOS.app].filter(
  (name) => !readdirSync(PHOTO_DIR).includes(name),
);
if (missing.length) {
  console.error(`Missing photos in ${PHOTO_DIR}: ${missing.join(", ")}`);
  process.exit(1);
}

const svgPath = resolve(OUT_DIR, "a4-flyer.svg");
const pngPath = resolve(OUT_DIR, "a4-flyer.png");
const pdfPath = resolve(OUT_DIR, "a4-flyer.pdf");

const svg = buildSvg();
writeFileSync(svgPath, svg, "utf8");

const qrBuffer = await QRCode.toBuffer(APP_URL, {
  errorCorrectionLevel: "M",
  margin: 1,
  width: 560,
  color: { dark: "#0d5c52", light: "#ffffff" },
});

const basePng = await sharp(Buffer.from(svg), { density: 200 })
  .resize(WIDTH, HEIGHT, { fit: "fill" })
  .png()
  .toBuffer();

const photoLayers = await buildPhotoLayers();

await sharp(basePng)
  .composite([
    ...photoLayers,
    { input: qrBuffer, left: 1560, top: 2220 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(pngPath);

await sharp(pngPath).toFile(pdfPath);

console.log(`Wrote ${svgPath}`);
console.log(`Wrote ${pngPath}`);
console.log(`Wrote ${pdfPath}`);
