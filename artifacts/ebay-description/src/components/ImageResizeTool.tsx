import { useCallback, useEffect, useRef, useState } from "react";
import BatchImageResize from "@/components/BatchImageResize";
import ResizeSettingsPanel, {
  DEFAULT_RESIZE_SETTINGS,
} from "@/components/ResizeSettingsPanel";
import {
  downloadBlob,
  formatFileSize,
  resizeImageFile,
  type ResizeResult,
} from "@/utils/imageResize";
import { IMAGE_ACCEPT, imageFormatLabel, isImageFile } from "@/utils/imageFile";
import { buildResizeOptions, outputFilename } from "@/utils/resizeSettings";
import type { ResizeSettingsState } from "@/utils/resizeSettings";

type ApplyTarget = "banner" | "product";
type Mode = "single" | "batch";

type Props = {
  onApply: (target: ApplyTarget, dataUrl: string) => void;
};

export default function ImageResizeTool({ onApply }: Props) {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === "single" ? "bg-white text-violet-700 shadow-sm" : "text-slate-600"
          }`}
        >
          단일 변환
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === "batch" ? "bg-white text-violet-700 shadow-sm" : "text-slate-600"
          }`}
        >
          일괄 변환
        </button>
      </div>

      {mode === "single" ? (
        <SingleImageResize onApply={onApply} />
      ) : (
        <BatchImageResize onApply={onApply} />
      )}
    </div>
  );
}

function SingleImageResize({
  onApply,
}: {
  onApply: (target: ApplyTarget, dataUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState<{ w: number; h: number } | null>(null);
  const [settings, setSettings] = useState<ResizeSettingsState>(DEFAULT_RESIZE_SETTINGS);
  const [result, setResult] = useState<ResizeResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runResize = useCallback(async () => {
    if (!sourceFile) return;
    setProcessing(true);
    setError(null);
    try {
      const resized = await resizeImageFile(sourceFile, buildResizeOptions(settings));
      setResult(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "변환 실패");
      setResult(null);
    } finally {
      setProcessing(false);
    }
  }, [sourceFile, settings]);

  useEffect(() => {
    if (!sourceFile) return;
    const timer = setTimeout(() => {
      void runResize();
    }, 200);
    return () => clearTimeout(timer);
  }, [sourceFile, settings, runResize]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setError("지원하지 않는 파일입니다. (JPEG, PNG, WEBP, GIF 등)");
      return;
    }

    if (sourcePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(sourcePreview);
    }

    setSourceFile(file);
    setResult(null);
    setError(null);

    const url = URL.createObjectURL(file);
    setSourcePreview(url);

    const img = new Image();
    img.onload = () => setSourceSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => {
      setError("이미지를 불러올 수 없습니다.");
      setSourceSize(null);
    };
    img.src = url;
  };

  const isUpscale =
    result &&
    sourceSize &&
    (result.width > sourceSize.w || result.height > sourceSize.h);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        JPEG, PNG, WEBP 등을 업로드하면 eBay 권장 크기로 변환합니다 (WEBP → JPEG/PNG).
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          사진 선택
        </button>
        {sourceFile ? (
          <span className="self-center text-xs text-slate-500">
            {sourceFile.name} ({imageFormatLabel(sourceFile)})
            {sourceSize ? ` · ${sourceSize.w}×${sourceSize.h}px` : ""}
          </span>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {sourcePreview && sourceSize ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="mb-1 text-xs font-medium text-slate-500">원본</p>
            <img src={sourcePreview} alt="original" className="max-h-36 w-full object-contain" />
          </div>
          {result ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-2">
              <p className="mb-1 text-xs font-medium text-violet-700">
                변환 결과 · {result.width}×{result.height}px ·{" "}
                {formatFileSize(result.fileSize)}
              </p>
              <img src={result.dataUrl} alt="resized" className="max-h-36 w-full object-contain" />
            </div>
          ) : null}
        </div>
      ) : null}

      <ResizeSettingsPanel
        settings={settings}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        disabled={!sourceFile || processing}
      />

      {isUpscale ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          원본보다 큰 크기로 변환 중입니다. 선명도 향상은 제한됩니다.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runResize()}
          disabled={!sourceFile || processing}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {processing ? "변환 중..." : "다시 변환"}
        </button>

        {result && sourceFile ? (
          <>
            <button
              type="button"
              onClick={() =>
                downloadBlob(
                  result.blob,
                  outputFilename(
                    sourceFile.name,
                    result.width,
                    result.height,
                    settings.format,
                  ),
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              다운로드
            </button>
            <button
              type="button"
              onClick={() => onApply("banner", result.dataUrl)}
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-800 hover:bg-violet-100"
            >
              배너에 적용
            </button>
            <button
              type="button"
              onClick={() => onApply("product", result.dataUrl)}
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-800 hover:bg-violet-100"
            >
              상품 이미지에 적용
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
