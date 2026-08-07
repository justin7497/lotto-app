import type { ReactNode } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import PageCard from "@/components/PageCard";
import DrawResultsPanel from "@/components/DrawResultsPanel";
import {
  RecommendFooterSaveActions,
  RecommendStickyFooter,
} from "@/components/RecommendSaveActions";

type DrawGameShellProps = {
  eyebrow: string;
  statusText: string;
  busy: boolean;
  done: boolean;
  drawn: number[];
  onAction: () => void;
  idleLabel: string;
  busyLabel: string;
  retryLabel?: string;
  children: ReactNode;
  saved: boolean;
  isDuplicate: boolean;
  saveError: string | null;
  onSave: () => void;
  saveDisabled?: boolean;
};

export default function DrawGameShell({
  eyebrow,
  statusText,
  busy,
  done,
  drawn,
  onAction,
  idleLabel,
  busyLabel,
  retryLabel = "다시 하기",
  children,
  saved,
  isDuplicate,
  saveError,
  onSave,
  saveDisabled = false,
}: DrawGameShellProps) {
  return (
    <div
      className={`ball-draw-page page-content space-y-0 pb-0${done ? " page-content--generator" : ""}`}
    >
      <PageCard className="ball-draw-page__machine-card">
        <div className="ball-draw-page__intro">
          <p className="ball-draw-page__eyebrow">
            <Sparkles className="ball-draw-page__eyebrow-icon" aria-hidden />
            {eyebrow}
          </p>
          <p className="ball-draw-page__status">{statusText}</p>
        </div>

        {children}

        <DrawResultsPanel drawn={drawn} />

        <div className="ball-draw-page__actions">
          <button
            type="button"
            className="page-cta page-cta--teal w-full"
            onClick={onAction}
            disabled={busy}
          >
            {busy ? (
              busyLabel
            ) : done ? (
              <>
                <RotateCcw className="w-5 h-5" aria-hidden />
                {retryLabel}
              </>
            ) : (
              idleLabel
            )}
          </button>

          {!done ? (
            <p className="ball-draw-page__save-hint">
              완료 후 「나의 로또번호에 저장」이 나타납니다
            </p>
          ) : null}
        </div>

        <p className="ball-draw-page__note">
          체험용 랜덤 추첨 · 실제 동행복권 추첨과 무관 · 저장 시 나의 로또번호에 보관
        </p>
      </PageCard>

      {done ? (
        <RecommendStickyFooter>
          <RecommendFooterSaveActions
            saved={saved}
            isDuplicate={isDuplicate}
            saveError={saveError}
            disabled={saveDisabled}
            onSave={onSave}
          />
        </RecommendStickyFooter>
      ) : null}
    </div>
  );
}
