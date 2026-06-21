/**
 * CI: 최신 회차 갱신 → 변경 시 커밋/배포
 * GitHub Actions 또는 수동: node scripts/ci-update-and-deploy.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { updateLottoData } from "./update-lotto-data.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const FORCE_DEPLOY = process.env.FORCE_DEPLOY === "1";

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readMaxRound() {
  const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  return Math.max(...rows.map((r) => r.drwNo));
}

async function main() {
  const beforeMax = readMaxRound();
  const { added, latestDrwNo } = await updateLottoData();
  const afterMax = readMaxRound();

  console.log(`Rounds: ${beforeMax} -> ${afterMax} (API latest: ${latestDrwNo}, added: ${added})`);

  const dataChanged = added > 0;
  if (!dataChanged && !FORCE_DEPLOY) {
    console.log("No new rounds. Skipping build/deploy.");
    return;
  }

  if (!process.env.FIREBASE_TOKEN) {
    throw new Error("FIREBASE_TOKEN is required for deploy");
  }

  if (dataChanged) {
    try {
      git('config user.name "github-actions[bot]"');
      git('config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
      run("git add artifacts/lotto-app/src/data/lottoData.json");
      run(`git commit -m "chore: update lotto data to ${afterMax}회"`);
      run("git push");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("nothing to commit")) throw err;
      console.warn("Commit skipped (nothing to commit).");
    }
  }

  run("corepack pnpm run build:lotto");
  run(
    "npx firebase-tools deploy --only hosting:lotto,firestore:rules --project lotto-app-ljh --non-interactive",
  );

  console.log(`Deploy complete. Latest round: ${afterMax}회`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
