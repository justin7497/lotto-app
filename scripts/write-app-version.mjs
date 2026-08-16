import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildId = process.env.VITE_APP_BUILD_ID || new Date().toISOString();
const builtAt = new Date().toISOString();
const promptFlag = process.env.APP_VERSION_PROMPT;
const prompt = promptFlag !== "0" && promptFlag !== "false";
const slipSrc = readFileSync(
  resolve(repoRoot, "artifacts/lotto-app/src/utils/mobileSlip.ts"),
  "utf8",
);
const slipEncodeMatch = slipSrc.match(/export const SLIP_ENCODE_VERSION = (\d+)/);
const slipEncodeVersion = Number(
  process.env.SLIP_ENCODE_VERSION || slipEncodeMatch?.[1] || "5",
);
const outPath = resolve(repoRoot, "artifacts/lotto-app/public/app-version.json");
const buildIdPath = resolve(repoRoot, "artifacts/lotto-app/.app-build-id");
const gradlePath = resolve(repoRoot, "artifacts/lotto-app/android-twa/app/build.gradle");

function readAndroidVersionFromGradle() {
  try {
    const gradle = readFileSync(gradlePath, "utf8");
    const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/);
    const versionNameMatch = gradle.match(/versionName\s+"([^"]+)"/);
    return {
      androidVersionCode: versionCodeMatch ? Number(versionCodeMatch[1]) : undefined,
      androidVersionName: versionNameMatch?.[1],
    };
  } catch {
    return {
      androidVersionCode: undefined,
      androidVersionName: undefined,
    };
  }
}

const androidVersion = readAndroidVersionFromGradle();

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      buildId,
      builtAt,
      label: buildId.slice(0, 10),
      prompt,
      slipEncodeVersion,
      ...androidVersion,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
writeFileSync(buildIdPath, buildId, "utf8");

console.log(
  `Wrote app-version.json (buildId=${buildId}, slipEncodeVersion=${slipEncodeVersion}, androidVersionCode=${androidVersion.androidVersionCode ?? "n/a"})`,
);
