import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "artifacts/lotto-app/android-twa");
const signingEnvPath = join(androidDir, "signing.env");
const bundleOutput = join(androidDir, "app/build/outputs/bundle/release/app-release.aab");
const bundleCopy = join(androidDir, "app-release-bundle.aab");

function loadSigningEnv() {
  if (!existsSync(signingEnvPath)) {
    throw new Error(
      `서명 정보가 없습니다: ${signingEnvPath}\n` +
        "BUBBLEWRAP_KEYSTORE_PASSWORD, BUBBLEWRAP_KEY_PASSWORD 를 설정해 주세요.",
    );
  }

  const env = { ...process.env };
  for (const line of readFileSync(signingEnvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }

  if (!env.BUBBLEWRAP_KEYSTORE_PASSWORD || !env.BUBBLEWRAP_KEY_PASSWORD) {
    throw new Error("signing.env 에 키스토어 비밀번호가 필요합니다.");
  }

  if (!existsSync(join(androidDir, "release.keystore"))) {
    throw new Error(`release.keystore 가 없습니다: ${join(androidDir, "release.keystore")}`);
  }

  return env;
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("1/2 웹 앱 빌드 (선택, --skip-web-build 로 생략 가능)");
if (!process.argv.includes("--skip-web-build")) {
  const webBuild = spawnSync("corepack", ["pnpm", "run", "build:lotto"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (webBuild.status !== 0) {
    console.warn("웹 빌드는 실패했지만 TWA는 호스팅 URL을 사용하므로 AAB 빌드를 계속합니다.");
  }
} else {
  console.log("웹 빌드 생략");
}

console.log("2/2 Android App Bundle 빌드");
const env = loadSigningEnv();
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(gradle, ["bundleRelease"], { cwd: androidDir, env });

if (!existsSync(bundleOutput)) {
  throw new Error(`AAB 생성 실패: ${bundleOutput}`);
}

copyFileSync(bundleOutput, bundleCopy);
console.log(`\n완료: ${bundleCopy}`);
