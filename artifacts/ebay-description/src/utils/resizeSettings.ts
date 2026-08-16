import { SIZE_PRESETS, type ResizeOptions } from "@/utils/imageResize";

export type ResizeSettingsState = {
  presetId: string;
  customWidth: number;
  customHeight: number;
  format: "jpeg" | "png";
  quality: number;
};

export function buildResizeOptions(state: ResizeSettingsState): ResizeOptions {
  const preset = SIZE_PRESETS.find((p) => p.id === state.presetId) ?? SIZE_PRESETS[1]!;
  const isCustom = state.presetId === "custom";
  const width = isCustom ? state.customWidth : preset.width;
  const height = isCustom && state.customHeight > 0 ? state.customHeight : preset.height;
  const mode =
    isCustom && state.customHeight > 0
      ? state.customWidth > 0 && state.customHeight > 0
        ? ("cover" as const)
        : ("fit-width" as const)
      : preset.mode;

  return {
    width,
    height,
    mode,
    format: state.format,
    quality: state.quality,
  };
}

export function outputFilename(
  originalName: string,
  width: number,
  height: number,
  format: "jpeg" | "png",
): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  const safe = base.replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
  const ext = format === "jpeg" ? "jpg" : "png";
  return `${safe}-${width}x${height}.${ext}`;
}
