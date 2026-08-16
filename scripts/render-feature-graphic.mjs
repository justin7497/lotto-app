import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const svgPath = resolve("artifacts/lotto-app/play-store/feature-graphic.svg");
const outPath = resolve("artifacts/lotto-app/play-store/feature-graphic.png");

const svg = readFileSync(svgPath);
await sharp(svg, { density: 144 })
  .resize(1024, 500, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(`Wrote ${outPath}`);
