import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout || "").trim();
}

export function collectGitChangeSummary() {
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";
  const shortHash = runGit(["rev-parse", "--short", "HEAD"]) || "unknown";
  const statusRaw = runGit(["status", "--short"]);
  const statusLines = statusRaw ? statusRaw.split(/\r?\n/).filter(Boolean) : [];
  const diffStat = runGit(["diff", "--stat", "HEAD"]) || "";
  const diffNames = runGit(["diff", "--name-only", "HEAD"]);
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"]);
  const changedFiles = [
    ...new Set(
      [
        ...(diffNames ? diffNames.split(/\r?\n/) : []),
        ...(untracked ? untracked.split(/\r?\n/) : []),
      ].filter(Boolean),
    ),
  ].sort();

  return {
    branch,
    shortHash,
    statusLines,
    changedFiles,
    diffStat: diffStat || "(커밋 대비 변경 없음)",
    hasChanges: statusLines.length > 0 || changedFiles.length > 0,
  };
}
