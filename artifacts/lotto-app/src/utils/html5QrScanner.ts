import type { QrScannerCallbacks } from "@/utils/qrScanner";

type ScannerHandle = {
  stop: () => Promise<void>;
};

type CameraDevice = { id: string; label: string };

const LAST_CAMERA_KEY = "sowon-lotto:qr-camera-id";

function readRememberedCameraId(): string | null {
  try {
    return localStorage.getItem(LAST_CAMERA_KEY);
  } catch {
    return null;
  }
}

function rememberCameraId(deviceId: string | undefined): void {
  if (!deviceId) return;
  try {
    localStorage.setItem(LAST_CAMERA_KEY, deviceId);
  } catch {
    /* private mode */
  }
}

function clearRememberedCameraId(): void {
  try {
    localStorage.removeItem(LAST_CAMERA_KEY);
  } catch {
    /* private mode */
  }
}

function isFrontLabel(label: string): boolean {
  return /front|user|selfie|facing\s*front|전면/i.test(label);
}

function isBackLabel(label: string): boolean {
  return /back|rear|environment|facing\s*back|후면/i.test(label);
}

function scoreRearCamera(label: string): number {
  const l = label.toLowerCase();
  let score = 0;
  if (isFrontLabel(l)) score -= 100;
  if (/ultra|wide|tele|macro|depth|tof/i.test(l)) score -= 15;
  if (isBackLabel(l)) score += 40;
  return score;
}

function pickPreferredBackCamera(cameras: CameraDevice[]): CameraDevice | undefined {
  const backs = cameras
    .filter((c) => !isFrontLabel(c.label))
    .sort((a, b) => scoreRearCamera(b.label) - scoreRearCamera(a.label));
  const namedBack = backs.find((c) => isBackLabel(c.label));
  return namedBack ?? backs[0];
}

async function safeStop(scanner: { isScanning?: boolean; stop: () => Promise<void> }): Promise<void> {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    /* already stopped / never started */
  }
}

/** 미리보기 셸(프레임·부팅 오버레이). 스캐너 DOM과 React 오버레이를 분리한다. */
function getScannerShell(host: HTMLElement): HTMLElement {
  return host.closest(".qr-scanner-wrap") ?? host;
}

function markHostBooting(host: HTMLElement): void {
  const shell = getScannerShell(host);
  shell.classList.add("qr-scanner--booting");
  shell.classList.remove("qr-scanner--ready");
}

function markHostReady(host: HTMLElement): void {
  const shell = getScannerShell(host);
  shell.classList.remove("qr-scanner--booting");
  shell.classList.add("qr-scanner--ready");
}

function clearHostVisualState(host: HTMLElement): void {
  const shell = getScannerShell(host);
  shell.classList.remove("qr-scanner--booting", "qr-scanner--ready");
}

/** 첫 프레임이 올 때까지 미리보기를 숨겨 초기 깨진 화면을 가림 */
async function waitForPreviewReady(host: HTMLElement, timeoutMs = 2500): Promise<void> {
  const video = host.querySelector("video");
  if (!video) return;

  if (video.readyState >= 2 && video.videoWidth > 0) return;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };
    const onReady = () => {
      if (video.videoWidth > 0) finish();
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
      window.clearTimeout(timer);
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    const timer = window.setTimeout(finish, timeoutMs);
    if (video.readyState >= 2 && video.videoWidth > 0) finish();
  });

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function isFrontTrack(settings: MediaTrackSettings, cameras: CameraDevice[]): boolean {
  if (settings.facingMode === "user") return true;
  if (settings.facingMode === "environment") return false;
  const cam = cameras.find((c) => c.id === settings.deviceId);
  return cam ? isFrontLabel(cam.label) : false;
}

/**
 * QR 스캔은 후면만. 전면 장치 ID는 후보에 넣지 않는다.
 * facingMode exact → 기억된 후면 → 라벨상 후면 → ideal 순.
 */
function buildCameraCandidates(cameras: CameraDevice[]): Array<string | MediaTrackConstraints> {
  const candidates: Array<string | MediaTrackConstraints> = [];
  const seen = new Set<string>();

  const pushId = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    candidates.push(id);
  };

  // 1) 후면 exact — ideal은 삼성에서 전면으로 떨어지는 경우가 많음
  candidates.push({ facingMode: { exact: "environment" } });

  // 2) 이전에 성공한 카메라 (전면으로 판명되면 폐기)
  const remembered = readRememberedCameraId();
  if (remembered) {
    const rememberedCam = cameras.find((c) => c.id === remembered);
    if (rememberedCam && isFrontLabel(rememberedCam.label)) {
      clearRememberedCameraId();
    } else {
      pushId(remembered);
    }
  }

  // 3) 라벨상 후면 / 전면이 아닌 장치만
  const preferred = pickPreferredBackCamera(cameras);
  pushId(preferred?.id);

  for (const cam of [...cameras].sort((a, b) => scoreRearCamera(b.label) - scoreRearCamera(a.label))) {
    if (isFrontLabel(cam.label)) continue;
    pushId(cam.id);
  }

  // 4) exact 실패 기기용 soft fallback (전면 deviceId는 여전히 제외)
  candidates.push({
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  });

  return candidates;
}

export async function startHtml5QrScanner(
  elementId: string,
  onDecode: (text: string) => void,
  callbacks?: QrScannerCallbacks,
): Promise<ScannerHandle> {
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

  const host = document.getElementById(elementId);
  if (!host) {
    throw new Error("SCANNER_ELEMENT_NOT_READY");
  }

  host.innerHTML = "";
  markHostBooting(host);

  let cameras: CameraDevice[] = [];
  try {
    cameras = (await Html5Qrcode.getCameras()) as CameraDevice[];
  } catch {
    cameras = [];
  }

  const makeScanner = () =>
    new Html5Qrcode(elementId, {
      verbose: false,
      useBarCodeDetectorIfSupported: true,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    });

  const baseConfig = {
    fps: 20,
    disableFlip: false,
  };

  const configWithVideo = {
    ...baseConfig,
    videoConstraints: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    } satisfies MediaTrackConstraints,
  };

  const cameraCandidates = buildCameraCandidates(cameras);

  let lastError: unknown;
  let scanner = makeScanner();

  for (const cameraIdOrConfig of cameraCandidates) {
    const useDeviceId = typeof cameraIdOrConfig === "string";
    const config = useDeviceId ? configWithVideo : baseConfig;

    try {
      markHostBooting(host);

      await scanner.start(
        cameraIdOrConfig,
        config,
        (decoded) => onDecode(decoded),
        () => {},
      );

      let settings: MediaTrackSettings = {};
      try {
        settings = scanner.getRunningTrackSettings() ?? {};
      } catch {
        settings = {};
      }

      // 전면이 열리면 즉시 닫고 다음 후보 (기억도 지우기)
      if (isFrontTrack(settings, cameras)) {
        clearRememberedCameraId();
        await safeStop(scanner);
        host.innerHTML = "";
        markHostBooting(host);
        scanner = makeScanner();
        lastError = new Error("FRONT_CAMERA_REJECTED");
        continue;
      }

      await waitForPreviewReady(host);

      rememberCameraId(settings.deviceId);

      markHostReady(host);
      callbacks?.onReady?.();

      return {
        stop: async () => {
          await safeStop(scanner);
          clearHostVisualState(host);
          host.innerHTML = "";
        },
      };
    } catch (error) {
      lastError = error;
      await safeStop(scanner);
      host.innerHTML = "";
      markHostBooting(host);
      scanner = makeScanner();
    }
  }

  clearHostVisualState(host);

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("NO_CAMERA");
}
