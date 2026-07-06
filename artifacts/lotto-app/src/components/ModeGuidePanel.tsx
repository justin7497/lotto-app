import type { GeneratorMode } from "@/data/types";
import { MODE_INFO, type SingleGeneratorMode } from "@/data/generatorModes";

function isSingleMode(mode: GeneratorMode): mode is SingleGeneratorMode {
  return mode in MODE_INFO;
}

interface ModeGuidePanelProps {
  mode: GeneratorMode;
  className?: string;
}

export default function ModeGuidePanel({ mode, className = "" }: ModeGuidePanelProps) {
  if (!isSingleMode(mode)) return null;
  const info = MODE_INFO[mode];
  const Icon = info.icon;

  return (
    <div
      className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-base font-bold text-gray-900">{info.label}</p>
      </div>
      <p className="text-base text-gray-700 leading-relaxed">{info.guide}</p>
    </div>
  );
}
