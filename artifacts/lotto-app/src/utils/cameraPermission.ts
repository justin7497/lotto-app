import { isAppWebViewShell } from "@/utils/nativeQrBridge";

export type CameraPermissionState = "granted" | "prompt" | "denied" | "unsupported";

const CAMERA_GRANTED_KEY = "sowon-lotto:camera-granted";

export function markCameraPermissionGranted(): void {
  try {
    localStorage.setItem(CAMERA_GRANTED_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function hasStoredCameraPermission(): boolean {
  try {
    return localStorage.getItem(CAMERA_GRANTED_KEY) === "1";
  } catch {
    return false;
  }
}

export async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";

  if (hasStoredCameraPermission()) {
    return "granted";
  }

  // Android WebView — Permissions API가 거의 동작하지 않아 prompt로 고정됨
  if (isAppWebViewShell()) {
    return "prompt";
  }

  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

/** @deprecated Prefer starting the scanner directly from a user click (WebView gesture). */
export async function requestCameraPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    for (const track of stream.getTracks()) track.stop();
    markCameraPermissionGranted();
    return true;
  } catch {
    return false;
  }
}
