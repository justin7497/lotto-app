import { SIZE_PRESETS } from "@/utils/imageResize";
import type { ResizeSettingsState } from "@/utils/resizeSettings";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

type Props = {
  settings: ResizeSettingsState;
  onChange: (patch: Partial<ResizeSettingsState>) => void;
  disabled?: boolean;
};

export default function ResizeSettingsPanel({ settings, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">크기 프리셋</span>
          <select
            value={settings.presetId}
            onChange={(e) => onChange({ presetId: e.target.value })}
            className={inputClass}
            disabled={disabled}
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">파일 형식</span>
          <select
            value={settings.format}
            onChange={(e) =>
              onChange({ format: e.target.value as ResizeSettingsState["format"] })
            }
            className={inputClass}
            disabled={disabled}
          >
            <option value="jpeg">JPEG (권장, 용량 작음)</option>
            <option value="png">PNG (투명 배경)</option>
          </select>
        </label>
      </div>

      {settings.presetId === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">너비 (px)</span>
            <input
              type="number"
              min={1}
              max={4000}
              value={settings.customWidth}
              onChange={(e) => onChange({ customWidth: Number(e.target.value) })}
              className={inputClass}
              disabled={disabled}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">높이 (px, 선택)</span>
            <input
              type="number"
              min={0}
              max={4000}
              value={settings.customHeight || ""}
              placeholder="비우면 비율 유지"
              onChange={(e) => onChange({ customHeight: Number(e.target.value) || 0 })}
              className={inputClass}
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {settings.format === "jpeg" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            JPEG 품질 — {Math.round(settings.quality * 100)}%
          </span>
          <input
            type="range"
            min={0.6}
            max={1}
            step={0.01}
            value={settings.quality}
            onChange={(e) => onChange({ quality: Number(e.target.value) })}
            className="w-full"
            disabled={disabled}
          />
        </label>
      ) : null}
    </div>
  );
}

export const DEFAULT_RESIZE_SETTINGS: ResizeSettingsState = {
  presetId: "product-hd",
  customWidth: 900,
  customHeight: 0,
  format: "jpeg",
  quality: 0.92,
};
