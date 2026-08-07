import { useEffect } from "react";
import { X } from "lucide-react";
import HomeSettingsSheetContent from "@/components/HomeSettingsSheetContent";
import HomeSheetMenuTile from "@/components/HomeSheetMenuTile";
import { useAuth } from "@/context/AuthContext";
import { useHomeCategoryContent } from "@/context/HomeThemeContext";
import { settingsCategoryLabel, type HomeCategoryId } from "@/data/homeMenuData";
import { useOverlayBack } from "@/hooks/useOverlayBack";

export default function HomeCategorySheet({
  open,
  categoryId,
  onClose,
}: {
  open: boolean;
  categoryId: HomeCategoryId | null;
  onClose: () => void;
}) {
  const content = useHomeCategoryContent(categoryId);
  const { isSignedIn, isLoaded } = useAuth();
  const closeSheet = useOverlayBack(open, onClose);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !content) return null;

  const isSettings = categoryId === "settings";
  const sheetTitle =
    isSettings && isLoaded ? settingsCategoryLabel(isSignedIn) : content.title;
  const gridClass =
    content.items.length === 1
      ? "home-category-sheet__grid home-category-sheet__grid--single"
      : categoryId === "guide"
        ? "home-category-sheet__grid home-category-sheet__grid--guide"
        : content.items.length >= 5
          ? "home-category-sheet__grid home-category-sheet__grid--dense"
          : "home-category-sheet__grid home-category-sheet__grid--quad";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
      role="presentation"
      onClick={closeSheet}
    >
      <div
        className={`home-category-sheet${isSettings ? "" : categoryId === "guide" ? " home-category-sheet--guide" : " home-category-sheet--menu"}`}
        role="dialog"
        aria-modal
        aria-labelledby="home-category-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="home-category-sheet__header">
          <h2 id="home-category-sheet-title" className="home-category-sheet__title">
            {sheetTitle}
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

        {isSettings ? (
          <HomeSettingsSheetContent onClose={onClose} />
        ) : (
          <div className="home-category-sheet__body">
            <ul className={gridClass}>
              {content.items.map((item) => (
                <li key={`${item.kind}-${item.label}`}>
                  <HomeSheetMenuTile item={item} onNavigate={onClose} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
