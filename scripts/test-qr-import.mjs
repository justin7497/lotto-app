import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsconfig = resolve(root, "artifacts/lotto-app/tsconfig.json");
const runner = resolve(root, "scripts/test-qr-import-runner.ts");

const pnpmCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";

const result = spawnSync(
  pnpmCommand,
  ["pnpm", "dlx", "tsx", "--tsconfig", tsconfig, runner],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: process.env },
);

process.exit(result.status ?? 1);
