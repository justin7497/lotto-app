import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const PATHS = {
  repoRoot,
  gradle: resolve(repoRoot, "artifacts/lotto-app/android-twa/app/build.gradle"),
  appVersionJson: resolve(repoRoot, "artifacts/lotto-app/public/app-version.json"),
  appBuildId: resolve(repoRoot, "artifacts/lotto-app/.app-build-id"),
  releasePreviewJson: resolve(repoRoot, "artifacts/lotto-app/public/release-preview.json"),
};

export function readAndroidVersionFromGradle(gradlePath = PATHS.gradle) {
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

export function readAppBuildId() {
  try {
    if (existsSync(PATHS.appBuildId)) {
      return readFileSync(PATHS.appBuildId, "utf8").trim();
    }
  } catch {
    /* ignore */
  }
  return process.env.VITE_APP_BUILD_ID || "dev";
}

export function readAppVersionJson() {
  try {
    if (existsSync(PATHS.appVersionJson)) {
      return JSON.parse(readFileSync(PATHS.appVersionJson, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function formatVersionSummary(android = readAndroidVersionFromGradle()) {
  const webBuildId = readAppBuildId();
  const name = android.androidVersionName ?? "?";
  const code = android.androidVersionCode ?? "?";
  return {
    webBuildId,
    androidVersionName: android.androidVersionName,
    androidVersionCode: android.androidVersionCode,
    label: `웹 ${webBuildId.slice(0, 19)}… · APK ${name} (${code})`,
  };
}
