/**
 * 메뉴 일러스트 PNG → WebP (있을 때만 실행)
 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ILLU_DIR = resolve("artifacts/lotto-app/public/illustrations");

if (!existsSync(ILLU_DIR)) {
  console.log("optimize-illustrations: no directory, skip.");
  process.exit(0);
}

const pngFiles = readdirSync(ILLU_DIR).filter((f) => f.toLowerCase().endsWith(".png"));
if (pngFiles.length === 0) {
  console.log("optimize-illustrations: no PNGs, skip.");
  process.exit(0);
}

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.log("optimize-illustrations: sharp not installed, skip.");
  process.exit(0);
}

const MAX_WIDTH = 480;
const WEBP_QUALITY = 78;

async function optimizeOne(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, ".webp");
  await sharp(pngPath)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(webpPath);
  console.log(`illust ${pngPath.split(/[/\\]/).pop()}: webp ok`);
}

let failed = 0;
for (const file of pngFiles) {
  try {
    await optimizeOne(join(ILLU_DIR, file));
  } catch (err) {
    failed += 1;
    console.error(`illust ${file}: failed`, err);
  }
}

process.exit(failed > 0 ? 1 : 0);
