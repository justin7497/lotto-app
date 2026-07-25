import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pnpmCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";
const lottoEnvPath = resolve("artifacts/lotto-app/.env.local");
const lottoEnv = {};

try {
  const envFile = readFileSync(lottoEnvPath, "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (key) lottoEnv[key] = value;
  }
} catch {
}

for (const script of [
  "write-lotto-sync.mjs",
  "write-lotto-prizes-sync.mjs",
  "write-lotto-stores-sync.mjs",
  "verify-lotto-sync.mjs",
  "optimize-illustrations.mjs",
]) {
  const sync = spawnSync(process.execPath, [resolve(`scripts/${script}`)], {
    stdio: "inherit",
  });
  if (sync.status !== 0) {
    process.exit(sync.status ?? 1);
  }
}

const typecheck = spawnSync(
  pnpmCommand,
  ["pnpm", "--filter", "@workspace/lotto-app", "run", "typecheck"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...lottoEnv,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
      PORT: process.env.PORT || "5173",
      BASE_PATH: process.env.BASE_PATH || "/",
    },
  },
);
if (typecheck.status !== 0) {
  process.exit(typecheck.status ?? 1);
}

const child = spawn(
  pnpmCommand,
  ["pnpm", "--filter", "@workspace/lotto-app", "run", "build"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...lottoEnv,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
      PORT: process.env.PORT || "5173",
      BASE_PATH: process.env.BASE_PATH || "/",
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
