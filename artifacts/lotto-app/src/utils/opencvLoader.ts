/* eslint-disable @typescript-eslint/no-explicit-any */
type CvModule = any;

let cvPromise: Promise<CvModule> | null = null;

async function initCv(module: CvModule): Promise<CvModule> {
  if (module instanceof Promise) return initCv(await module);
  if (module?.Mat) return module;
  await new Promise<void>((resolve) => {
    module.onRuntimeInitialized = () => resolve();
  });
  return module;
}

/** OpenCV.js 지연 로드 (슬립 스캔 시에만 ~8MB) */
export function loadOpenCv(): Promise<CvModule> {
  if (!cvPromise) {
    cvPromise = import("@techstark/opencv-js").then((mod) => initCv(mod.default ?? mod));
  }
  return cvPromise;
}
