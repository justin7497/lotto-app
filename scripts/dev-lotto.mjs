import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pnpmCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";
const children = [];
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

const api = spawn(process.execPath, ["./scripts/local-api.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    API_PORT: process.env.API_PORT || "8080",
  },
});
children.push(api);

const app = spawn(
  pnpmCommand,
  ["pnpm", "--filter", "@workspace/lotto-app", "run", "dev"],
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
children.push(app);

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    stopAll();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
