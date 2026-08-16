import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "artifacts/lotto-app/public");
const androidResDir = resolve(root, "artifacts/lotto-app/android-twa/app/src/main/res");
const sourceIcon = resolve(publicDir, "app-icon-source.png");
const cutoutIcon = resolve(publicDir, "app-icon-cutout.png");

const iconBackground = "#0b1630";

function removeBackdrop(data, channels) {
  const pixelCount = data.length / channels;
  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = (r + g + b) / 3;

    if (min >= 245) {
      data[offset + 3] = 0;
      continue;
    }

    if (luminance >= 168 && saturation <= 0.14) {
      const fade = luminance >= 228 ? 0 : (228 - luminance) / 60;
      data[offset + 3] = Math.round(data[offset + 3] * Math.max(0, Math.min(1, fade)));
      continue;
    }

    if (luminance >= 132 && saturation <= 0.08) {
      const fade = (168 - luminance) / 36;
      data[offset + 3] = Math.round(data[offset + 3] * Math.max(0, Math.min(1, fade)));
    }
  }
}

async function buildCutoutBuffer() {
  const { data, info } = await sharp(sourceIcon)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  removeBackdrop(data, info.channels);

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .trim()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writeCutoutAsset() {
  const cutout = await buildCutoutBuffer();
  writeFileSync(cutoutIcon, cutout);
  return cutout;
}

function renderSquareIcon(cutout, size, { paddingRatio = 0.06, background = iconBackground } = {}) {
  const inner = Math.round(size * (1 - paddingRatio * 2));

  return sharp(cutout)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
    .then((emblem) =>
      sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background,
        },
      }).composite([{ input: emblem, gravity: "center" }]),
    );
}

async function writeIcon(cutout, path, size, options = {}) {
  const image = await renderSquareIcon(cutout, size, options);
  await image.png({ compressionLevel: 9 }).toFile(path);
}

async function main() {
  const meta = await sharp(sourceIcon).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Could not read source icon: ${sourceIcon}`);
  }

  const cutout = await writeCutoutAsset();
  console.log(`Wrote app-icon-cutout.png (background removed)`);

  const webIcons = [
    ["favicon-16x16.png", 16, { paddingRatio: 0.04 }],
    ["favicon-32x32.png", 32, { paddingRatio: 0.05 }],
    ["favicon.png", 32, { paddingRatio: 0.05 }],
    ["apple-touch-icon.png", 180, { paddingRatio: 0.08 }],
    ["icon-192.png", 192, { paddingRatio: 0.08 }],
    ["icon-512.png", 512, { paddingRatio: 0.08 }],
    ["logo.png", 512, { paddingRatio: 0.08 }],
  ];

  for (const [name, size, options = {}] of webIcons) {
    await writeIcon(cutout, resolve(publicDir, name), size, options);
    console.log(`Wrote ${name} (${size}x${size})`);
  }

  const androidMipmaps = [
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];

  for (const [folder, size] of androidMipmaps) {
    const dir = resolve(androidResDir, folder);
    mkdirSync(dir, { recursive: true });
    await writeIcon(cutout, resolve(dir, "ic_launcher.png"), size, { paddingRatio: 0.08 });
    await writeIcon(cutout, resolve(dir, "ic_maskable.png"), size, { paddingRatio: 0.1 });
    console.log(`Wrote android ${folder} (${size}x${size})`);
  }

  const notificationSizes = [
    ["drawable-mdpi", 24],
    ["drawable-hdpi", 36],
    ["drawable-xhdpi", 48],
    ["drawable-xxhdpi", 72],
    ["drawable-xxxhdpi", 96],
  ];

  const splashSizes = [
    ["drawable-mdpi", 300],
    ["drawable-hdpi", 450],
    ["drawable-xhdpi", 600],
    ["drawable-xxhdpi", 900],
    ["drawable-xxxhdpi", 1200],
  ];

  for (const [folder, size] of notificationSizes) {
    const dir = resolve(androidResDir, folder);
    mkdirSync(dir, { recursive: true });
    await writeIcon(cutout, resolve(dir, "ic_notification_icon.png"), size, { paddingRatio: 0.1 });
  }
  console.log("Wrote android notification icons");

  for (const [folder, size] of splashSizes) {
    const dir = resolve(androidResDir, folder);
    mkdirSync(dir, { recursive: true });
    await writeIcon(cutout, resolve(dir, "splash.png"), size, { paddingRatio: 0.12 });
  }
  console.log("Wrote android splash drawables");

  console.log("\nApp icons generated from app-icon-source.png (cutout + navy background)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
