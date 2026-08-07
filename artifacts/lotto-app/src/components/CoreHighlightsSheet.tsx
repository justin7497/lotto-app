import { Sparkles, X } from "lucide-react";
import IllustImage from "@/components/IllustImage";
import type { CoreHighlightDetail } from "@/data/coreHighlightsData";
import { useOverlayBack } from "@/hooks/useOverlayBack";

export default function CoreHighlightsSheet({
  open,
  details,
  onClose,
}: {
  open: boolean;
  details: CoreHighlightDetail[];
  onClose: () => void;
}) {
  const closeSheet = useOverlayBack(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
      onClick={closeSheet}
      role="presentation"
    >
      <div
        className="home-category-sheet home-category-sheet--guide w-full max-h-[88dvh]"
        role="dialog"
        aria-modal
        aria-labelledby="core-highlights-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="home-category-sheet__header">
          <h2 id="core-highlights-sheet-title" className="home-category-sheet__title">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#127a6e]" aria-hidden />
              핵심 사항
            </span>
          </h2>
          <button
            type="button"
            onClick={closeSheet}
            className="home-category-sheet__close"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="home-category-sheet__body">
          <ul className="home-category-sheet__grid home-category-sheet__grid--guide">
            {details.map((item) => (
              <li key={item.title}>
                <div className="mania-menu-grid__tile mania-menu-grid__tile--sheet mania-menu-grid__tile--info">
                  <span className="mania-menu-grid__art" aria-hidden>
                    <IllustImage src={item.image} className="mania-menu-grid__img" loading="lazy" />
                  </span>
                  <span className="mania-menu-grid__label">{item.title}</span>
                  <span className="mania-menu-grid__desc mania-menu-grid__desc--guide">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
