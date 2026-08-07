import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildId = process.env.VITE_APP_BUILD_ID || new Date().toISOString();
const builtAt = new Date().toISOString();
const promptFlag = process.env.APP_VERSION_PROMPT;
const prompt = promptFlag !== "0" && promptFlag !== "false";
const outPath = resolve(repoRoot, "artifacts/lotto-app/public/app-version.json");
const buildIdPath = resolve(repoRoot, "artifacts/lotto-app/.app-build-id");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      buildId,
      builtAt,
      label: buildId.slice(0, 10),
      prompt,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
writeFileSync(buildIdPath, buildId, "utf8");

console.log(`Wrote app-version.json (buildId=${buildId})`);
