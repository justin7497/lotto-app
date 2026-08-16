import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { collectGitChangeSummary } from "./lib/gitChangeSummary.mjs";
import {
  formatVersionSummary,
  PATHS,
  readAndroidVersionFromGradle,
  readAppVersionJson,
} from "./lib/lottoVersion.mjs";

const generatedAt = new Date().toISOString();
const android = readAndroidVersionFromGradle();
const versions = formatVersionSummary(android);
const git = collectGitChangeSummary();
const deployed = readAppVersionJson();

const payload = {
  generatedAt,
  versions: {
    webBuildId: versions.webBuildId,
    androidVersionName: versions.androidVersionName,
    androidVersionCode: versions.androidVersionCode,
    deployedBuildId: deployed?.buildId ?? null,
    deployedAt: deployed?.builtAt ?? null,
  },
  git,
};

mkdirSync(dirname(PATHS.releasePreviewJson), { recursive: true });
writeFileSync(PATHS.releasePreviewJson, JSON.stringify(payload, null, 2) + "\n", "utf8");

console.log(`Wrote release-preview.json (${versions.label})`);
if (git.hasChanges) {
  console.log(`  변경 파일 ${git.changedFiles.length}개 · ${git.branch}@${git.shortHash}`);
} else {
  console.log(`  변경 없음 · ${git.branch}@${git.shortHash}`);
}
