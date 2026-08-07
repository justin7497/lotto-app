declare global {
  interface Window {
    SowonLotto?: {
      isNativeQrAvailable: () => boolean;
    };
  }
}

export function isAppWebViewShell(): boolean {
  return /SowonLottoApp\//i.test(navigator.userAgent);
}

/** Native QR overlay disabled — WebView getUserMedia (html5-qrcode) is used instead. */
export function isNativeQrScannerAvailable(): boolean {
  return false;
}
