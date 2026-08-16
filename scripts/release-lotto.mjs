import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collectGitChangeSummary } from "./lib/gitChangeSummary.mjs";
import { formatVersionSummary, PATHS } from "./lib/lottoVersion.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const withAab = args.has("--aab");
const withDeploy = args.has("--deploy");
const skipWeb = args.has("--skip-web");

function runNode(script, extraEnv = {}) {
  const result = spawnSync(process.execPath, [resolve(repoRoot, script)], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPnpm(script) {
  const pnpm = process.platform === "win32" ? "corepack.cmd" : "corepack";
  const result = spawnSync(pnpm, ["pnpm", "run", script], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printBanner(phase) {
  const versions = formatVersionSummary();
  const git = collectGitChangeSummary();
  console.log("\n════════════════════════════════════════");
  console.log(`  소원로또 통합 빌드 — ${phase}`);
  console.log("════════════════════════════════════════");
  console.log(`  구글 앱(웹)  buildId: ${versions.webBuildId}`);
  console.log(
    `  APK          ${versions.androidVersionName ?? "?"} (code ${versions.androidVersionCode ?? "?"})`,
  );
  console.log(`  Git          ${git.branch} @ ${git.shortHash}`);
  if (git.hasChanges) {
    console.log(`  변경 파일    ${git.changedFiles.length}개`);
    for (const line of git.statusLines.slice(0, 12)) {
      console.log(`    ${line}`);
    }
    if (git.statusLines.length > 12) {
      console.log(`    … 외 ${git.statusLines.length - 12}줄`);
    }
  } else {
    console.log("  변경 파일    없음 (커밋 상태)");
  }
  console.log("════════════════════════════════════════\n");
}

printBanner("빌드 전 미리보기");
console.log("미리보기: http://localhost:5173/dev/release\n");
runNode("scripts/write-release-preview.mjs");

if (!skipWeb) {
  console.log("▶ 웹 앱 빌드 (build:lotto)\n");
  runPnpm("build:lotto");
  runNode("scripts/write-release-preview.mjs");
} else {
  console.log("▶ 웹 빌드 생략 (--skip-web)\n");
}

if (withAab) {
  console.log("▶ Android AAB 빌드\n");
  const result = spawnSync(
    process.execPath,
    [resolve(repoRoot, "scripts/build-android-aab.mjs"), "--skip-web-build"],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (withDeploy) {
  console.log("▶ Firebase Hosting 배포\n");
  const result = spawnSync("firebase", ["deploy", "--only", "hosting:lotto"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  runNode("scripts/write-release-preview.mjs");
}

printBanner("완료");
console.log(`산출물: ${PATHS.appVersionJson}`);
if (withAab) {
  console.log("AAB: artifacts/lotto-app/android-twa/app-release-bundle.aab");
}
console.log("\n다음에 할 일:");
if (!withDeploy) {
  console.log("  배포: pnpm release:lotto --deploy");
}
if (!withAab) {
  console.log("  AAB:  pnpm release:lotto --aab");
}
console.log("  전체: pnpm release:lotto --aab --deploy\n");
