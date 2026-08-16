import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assetLinksPath,
  collectAssetLinkFingerprints,
  ensurePlaySigningFingerprint,
  writeAssetLinks,
} from "./lib/assetlinks.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const fingerprints = collectAssetLinkFingerprints();
ensurePlaySigningFingerprint(fingerprints);
writeAssetLinks(fingerprints);

console.log(`Updated ${assetLinksPath}`);
console.log("Fingerprints:");
for (const fp of fingerprints) {
  console.log(`  - ${fp}`);
}
