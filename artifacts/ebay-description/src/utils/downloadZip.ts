import { zipSync } from "fflate";

import { downloadBlob } from "@/utils/imageResize";

export async function downloadFilesAsZip(
  files: { name: string; blob: Blob }[],
  zipName = "ebay-images.zip",
) {
  const entries: Record<string, Uint8Array> = {};

  for (const file of files) {
    const buffer = await file.blob.arrayBuffer();
    entries[file.name] = new Uint8Array(buffer);
  }

  const zipped = zipSync(entries);
  const blob = new Blob([zipped], { type: "application/zip" });
  downloadBlob(blob, zipName);
}
