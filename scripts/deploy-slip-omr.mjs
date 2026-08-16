#!/usr/bin/env node
/**
 * Cloud Run 슬립 OMR 서비스 배포
 *
 * 사전 요건: gcloud CLI 로그인, 프로젝트 선택
 *
 *   node scripts/deploy-slip-omr.mjs
 *
 * 환경 변수:
 *   GCP_PROJECT   — Firebase/GCP 프로젝트 ID (기본: firebase projects:list 첫 항목)
 *   GCP_REGION    — 기본 us-central1 (무료 티어 리전)
 *   SERVICE_NAME  — 기본 slip-omr
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const serviceDir = path.join(root, "services", "slip-omr");

const project =
  process.env.GCP_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  execSync("firebase use", { cwd: root, encoding: "utf8" }).match(/\(([^)]+)\)/)?.[1] ||
  "";
const region = process.env.GCP_REGION || "us-central1";
const service = process.env.SERVICE_NAME || "slip-omr";

if (!project) {
  console.error("GCP 프로젝트를 찾을 수 없습니다. GCP_PROJECT 또는 firebase use 를 설정하세요.");
  process.exit(1);
}

const image = `gcr.io/${project}/${service}`;

console.log(`Deploying ${service} → ${region} (project: ${project})`);

execSync(`gcloud builds submit "${serviceDir}" --tag "${image}" --project "${project}"`, {
  stdio: "inherit",
  cwd: root,
});

execSync(
  [
    "gcloud run deploy",
    service,
    `--image "${image}"`,
    `--region ${region}`,
    `--project ${project}`,
    "--platform managed",
    "--allow-unauthenticated",
    "--memory 1Gi",
    "--cpu 1",
    "--timeout 60",
    "--max-instances 3",
    "--min-instances 0",
  ].join(" "),
  { stdio: "inherit", cwd: root },
);

const url = execSync(
  `gcloud run services describe ${service} --region ${region} --project ${project} --format="value(status.url)"`,
  { encoding: "utf8", cwd: root },
).trim();

console.log("\n✅ Cloud Run URL:", url);
console.log("\n다음 단계:");
console.log(`  firebase functions:secrets:set SLIP_OMR_URL`);
console.log(`  → 값: ${url}`);
console.log("  firebase deploy --only functions:slipOmrScan,hosting:lotto");
