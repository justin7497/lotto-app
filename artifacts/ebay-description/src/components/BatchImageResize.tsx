import { useRef, useState } from "react";
import ResizeSettingsPanel, {
  DEFAULT_RESIZE_SETTINGS,
} from "@/components/ResizeSettingsPanel";
import { downloadFilesAsZip } from "@/utils/downloadZip";
import { downloadBlob, formatFileSize, resizeImageFile } from "@/utils/imageResize";
import { IMAGE_ACCEPT, imageFormatLabel, isImageFile } from "@/utils/imageFile";
import {
  buildResizeOptions,
  outputFilename,
  type ResizeSettingsState,
} from "@/utils/resizeSettings";

type BatchItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "done" | "error";
  outputName?: string;
  outputSize?: number;
  width?: number;
  height?: number;
  blob?: Blob;
  error?: string;
};

type Props = {
  onApply: (target: "banner" | "product", dataUrl: string) => void;
};

let batchId = 0;

export default function BatchImageResize({ onApply }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [settings, setSettings] = useState<ResizeSettingsState>(DEFAULT_RESIZE_SETTINGS);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const next: BatchItem[] = [];
    for (const file of Array.from(fileList)) {
      if (!isImageFile(file)) continue;
      next.push({
        id: `batch-${++batchId}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      });
    }

    if (next.length === 0) return;
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    for (const item of items) {
      if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    }
    setItems([]);
    setProgress("");
  };

  const runBatch = async () => {
    if (items.length === 0 || processing) return;
    setProcessing(true);
    const opts = buildResizeOptions(settings);
    const pending = items.filter((i) => i.status !== "done" || !i.blob);

    for (let index = 0; index < pending.length; index++) {
      const item = pending[index]!;
      setProgress(`${index + 1} / ${pending.length} 변환 중…`);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "processing" } : i)),
      );

      try {
        const result = await resizeImageFile(item.file, opts);
        const outputName = outputFilename(
          item.file.name,
          result.width,
          result.height,
          settings.format,
        );
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "done",
                  outputName,
                  outputSize: result.fileSize,
                  width: result.width,
                  height: result.height,
                  blob: result.blob,
                  error: undefined,
                }
              : i,
          ),
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: err instanceof Error ? err.message : "변환 실패",
                }
              : i,
          ),
        );
      }
    }

    setProgress("");
    setProcessing(false);
  };

  const downloadZip = async () => {
    const ready = items.filter((i) => i.status === "done" && i.blob && i.outputName);
    if (ready.length === 0) return;
    await downloadFilesAsZip(
      ready.map((i) => ({ name: i.outputName!, blob: i.blob! })),
      `ebay-images-${ready.length}.zip`,
    );
  };

  const applyFirstToProduct = async () => {
    const first = items.find((i) => i.status === "done" && i.blob);
    if (!first?.blob) return;
    const dataUrl = await blobToDataUrl(first.blob);
    onApply("product", dataUrl);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        여러 장(JPEG, PNG, WEBP)을 한 번에 올려 동일 설정으로 변환합니다. ZIP으로
        한꺼번에 다운로드할 수 있습니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          여러 장 선택
        </button>
        {items.length > 0 ? (
          <>
            <span className="self-center text-xs text-slate-500">
              {items.length}장 · 완료 {doneCount}
              {errorCount > 0 ? ` · 실패 ${errorCount}` : ""}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              목록 비우기
            </button>
          </>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <ResizeSettingsPanel
        settings={settings}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        disabled={processing}
      />

      {items.length > 0 ? (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 text-xs"
            >
              <img
                src={item.previewUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-700">{item.file.name}</p>
                <p className="text-slate-500">
                  {imageFormatLabel(item.file)}
                  {item.status === "done" && item.width
                    ? ` → ${item.width}×${item.height}px · ${formatFileSize(item.outputSize ?? 0)}`
                    : null}
                  {item.status === "processing" ? " · 변환 중…" : null}
                  {item.status === "error" ? ` · ${item.error}` : null}
                  {item.status === "pending" ? " · 대기" : null}
                </p>
              </div>
              {item.status === "done" && item.blob && item.outputName ? (
                <button
                  type="button"
                  onClick={() => downloadBlob(item.blob!, item.outputName!)}
                  className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100"
                >
                  저장
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="shrink-0 rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {progress ? (
        <p className="text-sm text-violet-700">{progress}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runBatch()}
          disabled={items.length === 0 || processing}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {processing ? "일괄 변환 중…" : `일괄 변환 (${items.length}장)`}
        </button>

        {doneCount > 0 ? (
          <>
            <button
              type="button"
              onClick={() => void downloadZip()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              ZIP 다운로드 ({doneCount}장)
            </button>
            <button
              type="button"
              onClick={() => void applyFirstToProduct()}
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-800 hover:bg-violet-100"
            >
              첫 번째 → 상품 이미지
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("미리보기 생성 실패"));
    reader.readAsDataURL(blob);
  });
}
