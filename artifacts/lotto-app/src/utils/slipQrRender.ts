import QRCode from "qrcode";

/** 판매점 바코드 스캐너 인식률 — quiet zone·밀도 최적화 */
export async function renderSlipQrDataUrl(payload: string): Promise<string> {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 2;
  const width = Math.round(360 * dpr);

  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "L",
    margin: 4,
    width,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
