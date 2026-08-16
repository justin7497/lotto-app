const DECODER_HOST_ID = "qr-file-decoder-host";

function ensureDecoderHost(): HTMLElement {
  let host = document.getElementById(DECODER_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = DECODER_HOST_ID;
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(host);
  }
  return host;
}

export function formatQrImageError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/not found|no barcode|no qr|qr code parse error/i.test(msg)) {
    return "QR을 찾지 못했습니다. 티켓 우측 상단 QR이 선명하게 보이도록 다시 촬영해 주세요.";
  }
  if (/image|file|format|decode/i.test(msg)) {
    return "이미지를 읽을 수 없습니다. JPG·PNG 사진을 선택해 주세요.";
  }
  return "사진에서 QR을 읽을 수 없습니다.";
}

/** 갤러리·카메라 롤 사진에서 QR 문자열 추출 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  ensureDecoderHost();
  const { Html5Qrcode } = await import("html5-qrcode");
  const scanner = new Html5Qrcode(DECODER_HOST_ID, { verbose: false });
  return scanner.scanFile(file, false);
}
