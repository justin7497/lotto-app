import type { QrScannerCallbacks } from "@/utils/qrScanner";

type ScannerHandle = {
  stop: () => Promise<void>;
};

export async function startHtml5QrScanner(
  elementId: string,
  onDecode: (text: string) => void,
  callbacks?: QrScannerCallbacks,
): Promise<ScannerHandle> {
  const { Html5Qrcode } = await import("html5-qrcode");

  const host = document.getElementById(elementId);
  if (!host) {
    throw new Error("SCANNER_ELEMENT_NOT_READY");
  }

  host.innerHTML = "";

  const scanner = new Html5Qrcode(elementId, { verbose: false });
  const cameras = await Html5Qrcode.getCameras();
  const back =
    cameras.find((c) => /back|rear|environment/i.test(c.label)) ??
    cameras[cameras.length - 1];

  if (!back) {
    throw new Error("NO_CAMERA");
  }

  const rect = host.getBoundingClientRect();
  const viewMin = Math.max(Math.min(rect.width, rect.height), 120);

  await scanner.start(
    back.id,
    {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight, viewMin) * 0.88);
        return { width: edge, height: edge };
      },
      aspectRatio: 1,
    },
    (decoded) => onDecode(decoded),
    () => {},
  );

  callbacks?.onReady?.();

  return {
    stop: async () => {
      try {
        await scanner.stop();
      } catch {
        /* already stopped */
      }
      host.innerHTML = "";
    },
  };
}
