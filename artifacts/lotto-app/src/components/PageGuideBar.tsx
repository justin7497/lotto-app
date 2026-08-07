import { BarChart3, BookOpen } from "lucide-react";
import PageCard from "@/components/PageCard";

export default function PageGuideBar({
  tag,
  guideLabel,
  onGuide,
  analysisLabel,
  onAnalysis,
}: {
  tag: string;
  guideLabel: string;
  onGuide: () => void;
  analysisLabel?: string;
  onAnalysis?: () => void;
}) {
  return (
    <PageCard className="!py-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-semibold text-gray-700">{tag}</p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onGuide}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
          >
            <BookOpen className="w-4 h-4" />
            {guideLabel}
          </button>
          {analysisLabel && onAnalysis ? (
            <button
              type="button"
              onClick={onAnalysis}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              <BarChart3 className="w-4 h-4" />
              {analysisLabel}
            </button>
          ) : null}
        </div>
      </div>
    </PageCard>
  );
}
