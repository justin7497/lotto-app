export type ResizeFormat = "jpeg" | "png";

export type SizePreset = {
  id: string;
  label: string;
  width: number;
  height?: number;
  mode: "fit-width" | "fit-height" | "cover" | "exact";
};

export const SIZE_PRESETS: SizePreset[] = [
  { id: "banner", label: "배너 — 900px (전체폭)", width: 900, mode: "fit-width" },
  { id: "product-hd", label: "상품 대표 — 1600px (고해상도)", width: 1600, mode: "fit-width" },
  { id: "product", label: "상품 표시 — 500px", width: 500, mode: "fit-width" },
  { id: "gallery", label: "eBay 갤러리 — 1600×1600", width: 1600, height: 1600, mode: "cover" },
  { id: "custom", label: "직접 입력", width: 900, mode: "fit-width" },
];

export type ResizeOptions = {
  width: number;
  height?: number;
  mode: SizePreset["mode"];
  format: ResizeFormat;
  quality: number;
};

export type ResizeResult = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "webp") {
        reject(
          new Error(
            "WEBP 파일을 불러올 수 없습니다. 브라우저 미지원 또는 손상된 파일일 수 있습니다.",
          ),
        );
        return;
      }
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

export function calcTargetSize(
  sourceW: number,
  sourceH: number,
  options: ResizeOptions,
): { width: number; height: number } {
  const { width: targetW, height: targetH, mode } = options;

  if (mode === "exact" && targetH) {
    return { width: targetW, height: targetH };
  }

  if (mode === "cover" && targetH) {
    const scale = Math.max(targetW / sourceW, targetH / sourceH);
    return {
      width: Math.round(sourceW * scale),
      height: Math.round(sourceH * scale),
    };
  }

  if (mode === "fit-height" && targetH) {
    const scale = targetH / sourceH;
    return {
      width: Math.round(sourceW * scale),
      height: targetH,
    };
  }

  const scale = targetW / sourceW;
  return {
    width: targetW,
    height: Math.round(sourceH * scale),
  };
}

export async function resizeImageFile(
  file: File,
  options: ResizeOptions,
): Promise<ResizeResult> {
  const img = await loadImage(file);
  const sourceW = img.naturalWidth;
  const sourceH = img.naturalHeight;

  if (sourceW === 0 || sourceH === 0) {
    throw new Error("유효하지 않은 이미지입니다.");
  }

  const scaled = calcTargetSize(sourceW, sourceH, options);
  const canvas = document.createElement("canvas");

  if (options.mode === "cover" && options.height) {
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas를 사용할 수 없습니다.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const scale = Math.max(options.width / sourceW, options.height / sourceH);
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const dx = (options.width - drawW) / 2;
    const dy = (options.height - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas를 사용할 수 없습니다.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, scaled.width, scaled.height);
  }

  const mime = options.format === "jpeg" ? "image/jpeg" : "image/png";
  const quality = options.format === "jpeg" ? options.quality : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("변환에 실패했습니다."))),
      mime,
      quality,
    );
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("미리보기 생성 실패"));
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    fileSize: blob.size,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
