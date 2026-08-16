import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const assetLinksPath = resolve(
  root,
  "artifacts/lotto-app/public/.well-known/assetlinks.json",
);
export const distAssetLinksPath = resolve(
  root,
  "artifacts/lotto-app/dist/public/.well-known/assetlinks.json",
);
export const keystorePath = resolve(root, "artifacts/lotto-app/android-twa/release.keystore");
export const signingEnvPath = resolve(root, "artifacts/lotto-app/android-twa/signing.env");
export const packageId = "com.ljh.sowonlotto";
const keyAlias = "sowonlotto";

function parseEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

export function getUploadKeystoreFingerprint(storePassword) {
  const result = spawnSync(
    "keytool",
    [
      "-list",
      "-v",
      "-keystore",
      keystorePath,
      "-alias",
      keyAlias,
      "-storepass",
      storePassword,
    ],
    { encoding: "utf8", shell: false },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to read upload keystore fingerprint");
  }

  const match = result.stdout.match(/SHA256:\s*([0-9A-F:]+)/i);
  if (!match) {
    throw new Error("Could not parse SHA256 fingerprint from upload keystore");
  }

  return match[1].toUpperCase();
}

export function collectAssetLinkFingerprints(env = process.env) {
  const signingEnv = parseEnvFile(signingEnvPath);
  const merged = { ...signingEnv, ...env };
  const fingerprints = [];

  const uploadPass = merged.BUBBLEWRAP_KEYSTORE_PASSWORD;
  if (uploadPass && existsSync(keystorePath)) {
    fingerprints.push(getUploadKeystoreFingerprint(uploadPass));
  }

  const playFingerprint = merged.PLAY_APP_SIGNING_SHA256?.trim();
  if (playFingerprint) {
    fingerprints.push(playFingerprint.toUpperCase());
  }

  const quantumFingerprint = merged.PLAY_QUANTUM_SHA256?.trim();
  if (quantumFingerprint) {
    fingerprints.push(quantumFingerprint.toUpperCase());
  }

  const installedFingerprint = merged.PLAY_INSTALLED_SHA256?.trim();
  if (installedFingerprint) {
    fingerprints.push(installedFingerprint.toUpperCase());
  }

  const extra = merged.EXTRA_SHA256_FINGERPRINTS?.split(/[,\s]+/).filter(Boolean) ?? [];
  for (const fp of extra) {
    fingerprints.push(fp.toUpperCase());
  }

  return [...new Set(fingerprints)];
}

export function writeAssetLinks(fingerprints) {
  if (fingerprints.length === 0) {
    throw new Error("No SHA256 fingerprints available for assetlinks.json");
  }

  const payload = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageId,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  mkdirSync(dirname(assetLinksPath), { recursive: true });
  writeFileSync(assetLinksPath, json, "utf8");

  if (existsSync(dirname(distAssetLinksPath))) {
    mkdirSync(dirname(distAssetLinksPath), { recursive: true });
    writeFileSync(distAssetLinksPath, json, "utf8");
  }

  return assetLinksPath;
}

export function ensurePlaySigningFingerprint(fingerprints) {
  if (fingerprints.length >= 2) return;
  console.warn(
    "\n[주의] PLAY_APP_SIGNING_SHA256 이 signing.env 에 없습니다.\n" +
      "Play Store에서 설치한 앱은 Google 앱 서명 키로 서명되므로,\n" +
      "상단 주소창을 없애려면 Play Console → 앱 무결성 → 앱 서명 키 인증서의 SHA-256 을\n" +
      "signing.env 에 PLAY_APP_SIGNING_SHA256=... 로 추가한 뒤 다시 실행하세요.\n",
  );
  if (!process.env.PLAY_QUANTUM_SHA256 && fingerprints.length < 3) {
    console.warn(
      "[권장] Play Console → 양자 내성 암호화 키 SHA-256 을\n" +
        "signing.env 의 PLAY_QUANTUM_SHA256=... 에도 추가하세요 (최신 기기 TWA 검증용).\n",
    );
  }
}
