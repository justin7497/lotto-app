import { spawn } from "node:child_process";

const pnpmCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";

const child = spawn(
  pnpmCommand,
  ["pnpm", "--filter", "@workspace/ebay-description", "run", "build"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
