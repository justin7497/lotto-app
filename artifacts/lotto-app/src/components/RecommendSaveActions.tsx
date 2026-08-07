import type { ReactNode } from "react";
import { useLocation } from "wouter";
import AutoSaveNotice from "@/components/AutoSaveNotice";

export function GoToMyNumbersButton({ className = "" }: { className?: string }) {
  const [, navigate] = useLocation();

  return (
    <button
      type="button"
      onClick={() => navigate("/saved-numbers")}
      className={`page-cta page-cta--secondary page-cta--large w-full${className ? ` ${className}` : ""}`}
    >
      나의 로또번호 이동
    </button>
  );
}

export function SaveToMyNumbersButton({
  saved,
  disabled,
  onClick,
}: {
  saved: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={Boolean(disabled) || saved}
      className="page-cta page-cta--dark page-cta--large w-full disabled:opacity-50"
    >
      {saved ? "저장됨" : "나의 로또번호에 저장"}
    </button>
  );
}

/** 생성 결과 바로 아래 — 저장 버튼을 먼저 보이게 */
export function RecommendResultSaveActions({
  saved,
  isDuplicate,
  saveError,
  disabled,
  onSave,
  slipSlot,
  className = "",
}: {
  saved: boolean;
  isDuplicate: boolean;
  saveError?: string | null;
  disabled?: boolean;
  onSave: () => void;
  slipSlot?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`recommend-result-actions${className ? ` ${className}` : ""}`}
      aria-label="나의 로또번호 저장"
    >
      <AutoSaveNotice
        saved={saved}
        isDuplicate={isDuplicate}
        error={saveError}
        className="mb-3"
      />
      <div className="recommend-save-actions__stack">
        <SaveToMyNumbersButton saved={saved} disabled={disabled || isDuplicate} onClick={onSave} />
        <GoToMyNumbersButton />
      </div>
      {slipSlot ? <div className="recommend-result-actions__slip">{slipSlot}</div> : null}
    </section>
  );
}

/** 하단 고정 영역 — 저장 안내 + 저장 + 이동 */
export function RecommendFooterSaveActions({
  saved,
  isDuplicate,
  saveError,
  disabled,
  onSave,
}: {
  saved: boolean;
  isDuplicate: boolean;
  saveError?: string | null;
  disabled?: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <AutoSaveNotice
        saved={saved}
        isDuplicate={isDuplicate}
        error={saveError}
        className="mb-3"
      />
      <div className="recommend-save-actions__stack">
        <SaveToMyNumbersButton saved={saved} disabled={disabled || isDuplicate} onClick={onSave} />
        <GoToMyNumbersButton />
      </div>
    </>
  );
}

export function RecommendStickyFooter({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="page-sticky-footer recommend-save-footer" role="region" aria-label="번호 작업">
      <div className="page-sticky-footer__inner">
        {hint ? <p className="recommend-save-footer__hint">{hint}</p> : null}
        {children}
      </div>
    </div>
  );
}
