import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assetLinksPath,
  collectAssetLinkFingerprints,
  ensurePlaySigningFingerprint,
  keystorePath,
  signingEnvPath,
  writeAssetLinks,
} from "./lib/assetlinks.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const twaDir = resolve(root, "artifacts/lotto-app/android-twa");
const keyAlias = "sowonlotto";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function loadSigningEnv() {
  if (!existsSync(signingEnvPath)) {
    console.error(
      `Missing ${signingEnvPath}\nCopy signing.env.example to signing.env and set passwords.`,
    );
    process.exit(1);
  }

  const env = { ...process.env };
  for (const line of readFileSync(signingEnvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) env[key] = value;
  }

  if (!env.BUBBLEWRAP_KEYSTORE_PASSWORD || !env.BUBBLEWRAP_KEY_PASSWORD) {
    console.error("signing.env must set BUBBLEWRAP_KEYSTORE_PASSWORD and BUBBLEWRAP_KEY_PASSWORD");
    process.exit(1);
  }

  return env;
}

function run(command, args, options = {}) {
  const useShell = options.shell ?? process.platform === "win32";
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: useShell,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureKeystore(env) {
  if (existsSync(keystorePath)) return;

  const password = env.BUBBLEWRAP_KEYSTORE_PASSWORD;
  mkdirSync(twaDir, { recursive: true });

  console.log("Creating release keystore…");
  const dname = "CN=LJH, OU=Mobile, O=LJH, L=Seoul, ST=Seoul, C=KR";
  run(
    "keytool",
    [
      "-genkeypair",
      "-v",
      "-keystore",
      keystorePath,
      "-alias",
      keyAlias,
      "-keyalg",
      "RSA",
      "-keysize",
      "2048",
      "-validity",
      "10000",
      "-storepass",
      password,
      "-keypass",
      env.BUBBLEWRAP_KEY_PASSWORD,
      "-dname",
      dname,
    ],
    { shell: false },
  );
}

function ensureSigningConfig() {
  const buildGradlePath = resolve(twaDir, "app/build.gradle");
  if (!existsSync(buildGradlePath)) return;

  const marker = "signingConfigs {";
  let content = readFileSync(buildGradlePath, "utf8");
  if (content.includes(marker)) return;

  content = content.replace(
    /    buildTypes \{\s+release \{\s+minifyEnabled true\s+\}\s+\}/,
    `    signingConfigs {
        release {
            def storePass = System.getenv("BUBBLEWRAP_KEYSTORE_PASSWORD")
            def keyPass = System.getenv("BUBBLEWRAP_KEY_PASSWORD")
            storeFile file("../release.keystore")
            storePassword storePass
            keyAlias "sowonlotto"
            keyPassword keyPass
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
        }
    }`,
  );
  writeFileSync(buildGradlePath, content, "utf8");
}

function ensureLocalProperties() {
  const sdkRoot =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    resolve(process.env.USERPROFILE || process.env.HOME || "", ".bubblewrap/android_sdk");

  if (!existsSync(sdkRoot)) {
    console.error(
      `Android SDK not found at ${sdkRoot}. Run bubblewrap build once or install Android SDK.`,
    );
    process.exit(1);
  }

  const sdkDir = sdkRoot.replace(/\\/g, "/");
  writeFileSync(
    resolve(twaDir, "local.properties"),
    `sdk.dir=${sdkDir}\n`,
    "utf8",
  );
}

function ensureAndroidProject(env) {
  const gradlewPath = resolve(twaDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  if (!existsSync(gradlewPath)) {
    console.log("Generating Android project from twa-manifest.json…");
    run(
      npxCommand,
      ["--yes", "@bubblewrap/cli@latest", "update", "--skipVersionUpgrade"],
      { cwd: twaDir, env },
    );
  }

  ensureSigningConfig();
}

function main() {
  const env = loadSigningEnv();
  ensureKeystore(env);

  const fingerprints = collectAssetLinkFingerprints(env);
  ensurePlaySigningFingerprint(fingerprints);
  writeAssetLinks(fingerprints);
  console.log(`Wrote ${assetLinksPath}`);
  ensureAndroidProject(env);
  ensureLocalProperties();

  console.log("Building signed AAB with Gradle…");
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  run(gradlew, ["bundleRelease"], { cwd: twaDir, env });

  const builtAab = resolve(twaDir, "app/build/outputs/bundle/release/app-release.aab");
  const aabPath = resolve(twaDir, "app-release-bundle.aab");
  if (!existsSync(builtAab)) {
    console.error("Gradle finished but app-release.aab was not found.");
    process.exit(1);
  }

  copyFileSync(builtAab, aabPath);

  console.log(`\nAAB ready: ${aabPath}`);
  console.log("Upload this file to Google Play Console.");
  console.log("Deploy hosting so assetlinks.json is live for TWA verification.");
}

main();
