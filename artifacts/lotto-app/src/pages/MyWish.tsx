import { useEffect, useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import AffirmationCardSwiper from "@/components/AffirmationCardSwiper";
import MyWishListSheet from "@/components/MyWishListSheet";
import PageCard from "@/components/PageCard";
import { TrustPanel } from "@/components/TrustUI";
import {
  AFFIRMATION_CATEGORIES,
  type AffirmationCategoryId,
} from "@/data/affirmationData";
import {
  clearMyWishes,
  deleteMyWish,
  loadMyWishes,
  saveMyWish,
  type MyWish,
} from "@/utils/myWishStorage";
import { getCategoryAffirmations } from "@/utils/affirmationPicker";
import { AFFIRMATION_CONTENT_NOTICE } from "@/data/affirmationNotice";

export default function MyWish() {
  const [categoryId, setCategoryId] = useState<AffirmationCategoryId>("secret");
  const [activeIndex, setActiveIndex] = useState(0);
  const [wishes, setWishes] = useState<MyWish[]>(() => loadMyWishes());
  const [savedOpen, setSavedOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryAffirmations = useMemo(
    () => getCategoryAffirmations(categoryId),
    [categoryId],
  );

  const activeCategory = useMemo(
    () => AFFIRMATION_CATEGORIES.find((category) => category.id === categoryId),
    [categoryId],
  );

  const current = categoryAffirmations[activeIndex] ?? categoryAffirmations[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [categoryId]);

  useEffect(() => {
    if (!message && !error) return;
    const t = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [message, error]);

  function refreshSaved() {
    setWishes(loadMyWishes());
  }

  function selectCategory(id: AffirmationCategoryId) {
    setCategoryId(id);
    setError(null);
  }

  function handleSave() {
    if (!current) return;
    setError(null);
    const result = saveMyWish(current.content, {
      source: "preset",
      categoryId: current.categoryId,
      title: current.title,
      affirmationId: current.id,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refreshSaved();
    setMessage("확언을 저장했습니다.");
    setSavedOpen(true);
  }

  function handleDelete(id: string) {
    deleteMyWish(id);
    refreshSaved();
    setMessage("저장한 확언을 삭제했습니다.");
  }

  function handleClearAll() {
    clearMyWishes();
    refreshSaved();
    setMessage("저장한 확언을 모두 지웠습니다.");
  }

  return (
    <div className="page-content my-wish-page pb-0">
      <TrustPanel className="trust-panel--wide my-wish-page__intro shrink-0">
        <p className="trust-lead my-wish-page__lead">
          오늘 나에게 필요한 로또 행운 확언을 골라 보세요.
        </p>
        <button
          type="button"
          onClick={() => setSavedOpen(true)}
          className="my-wish-page__saved-btn"
        >
          저장한 확언 보기
          {wishes.length > 0 ? (
            <span className="my-wish-page__saved-count" aria-label={`저장된 확언 ${wishes.length}개`}>
              {wishes.length}
            </span>
          ) : null}
        </button>
      </TrustPanel>

      <PageCard className="my-wish-page__panel affirmation-page__panel">
        <div
          className="wish-category-chips my-wish-page__chips affirmation-page__chips"
          role="tablist"
          aria-label="확언 카테고리"
        >
          {AFFIRMATION_CATEGORIES.map((category) => {
            const active = categoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectCategory(category.id)}
                className={`wish-category-chip${active ? " wish-category-chip--active" : ""}`}
              >
                <span aria-hidden>{category.emoji}</span>
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        <div className="affirmation-stage">
          <AffirmationCardSwiper
            affirmations={categoryAffirmations}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
            categoryLabel={activeCategory?.label ?? ""}
            categoryEmoji={activeCategory?.emoji ?? ""}
          />
        </div>

        <div className="my-wish-page__footer affirmation-page__footer">
          {(error || message) && (
            <p
              className={`my-wish-page__status text-sm text-center ${error ? "text-red-600" : "text-emerald-600"}`}
              role="status"
            >
              {error ?? message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!current}
            className="page-cta page-cta--dark w-full my-wish-page__save"
          >
            <Bookmark className="w-4 h-4" strokeWidth={2.25} aria-hidden />
            확언 저장
          </button>
        </div>
      </PageCard>

      <p className="my-wish-page__disclaimer">{AFFIRMATION_CONTENT_NOTICE}</p>

      <MyWishListSheet
        open={savedOpen}
        wishes={wishes}
        onClose={() => setSavedOpen(false)}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
