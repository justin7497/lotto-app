import { spawn } from "node:child_process";
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

const child = spawn(
  pnpmCommand,
  ["pnpm", "--filter", "@workspace/lotto-app", "run", "build"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...lottoEnv,
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
