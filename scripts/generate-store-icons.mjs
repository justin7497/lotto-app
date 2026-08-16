import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = resolve(root, "artifacts/lotto-app/public/icon-512.png");
const outDir = resolve(root, "artifacts/lotto-app/store");

const backgroundColor = "#1a2848";

async function main() {
  mkdirSync(outDir, { recursive: true });

  const source = sharp(sourceIcon);
  const meta = await source.metadata();

  if (meta.width !== 512 || meta.height !== 512) {
    throw new Error(`Expected 512x512 source icon, got ${meta.width}x${meta.height}`);
  }

  await sharp(sourceIcon)
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, "google-play-icon-512.png"));

  await sharp(sourceIcon)
    .resize(1024, 1024, { kernel: sharp.kernel.lanczos3 })
    .flatten({ background: backgroundColor })
    .png({ compressionLevel: 9, force: true })
    .toFile(resolve(outDir, "app-store-icon-1024.png"));

  await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 3,
      background: "#1a2848",
    },
  })
    .composite([
      {
        input: await sharp(sourceIcon).resize(360, 360, { kernel: sharp.kernel.lanczos3 }).png().toBuffer(),
        left: 72,
        top: 70,
      },
      {
        input: Buffer.from(
          `<svg width="520" height="220" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="92" fill="#f4d77a" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-size="72" font-weight="700">소원로또</text>
            <text x="0" y="170" fill="#d8e4ff" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-size="34" font-weight="600">번호 생성 · 저장 · 당첨 확인</text>
          </svg>`,
        ),
        left: 470,
        top: 140,
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, "google-play-feature-graphic-1024x500.png"));

  const files = [
    "google-play-icon-512.png (512×512, Play 스토어 아이콘)",
    "app-store-icon-1024.png (1024×1024, App Store 아이콘)",
    "google-play-feature-graphic-1024x500.png (1024×500, Play 스토어 배너)",
  ];

  console.log(`Store assets written to ${outDir}`);
  for (const file of files) console.log(`- ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
