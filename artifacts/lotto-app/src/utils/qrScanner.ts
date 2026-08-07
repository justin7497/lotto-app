export type QrScannerCallbacks = {
  onError?: (message: string) => void;
  onReady?: () => void;
};

export type QrScannerOptions = QrScannerCallbacks & {
  /** 탭 전환 등 직전 카메라 해제 대기 */
  embedded?: boolean;
};

export function formatQrScannerError(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "SCANNER_ELEMENT_NOT_READY":
        return "화면을 불러오지 못했습니다. 다시 시도해 주세요.";
      case "NO_CAMERA":
        return "카메라를 찾을 수 없습니다.";
      default:
        break;
    }
  }
  return "카메라를 열 수 없습니다. 권한을 확인한 뒤 다시 시도해 주세요.";
}

async function waitForScannerMount(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForCameraRelease(embedded: boolean): Promise<void> {
  if (!embedded) return;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
}

async function waitForScannerElement(elementId: string, timeoutMs = 4000): Promise<HTMLElement> {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const host = document.getElementById(elementId);
    if (host) {
      const rect = host.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) {
        return host;
      }
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  throw new Error("SCANNER_ELEMENT_NOT_READY");
}

export async function startQrScanner(
  elementId: string,
  onDecode: (text: string) => void,
  options?: QrScannerOptions,
): Promise<{ stop: () => Promise<void> }> {
  await waitForScannerMount();
  await waitForCameraRelease(Boolean(options?.embedded));
  await waitForScannerElement(elementId);
  const { startHtml5QrScanner } = await import("@/utils/html5QrScanner");
  return startHtml5QrScanner(elementId, onDecode, options);
}
