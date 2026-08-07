import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import PageCard from "@/components/PageCard";
import SlipBallRow from "@/components/SlipBallRow";
import { DeleteActionButton } from "@/components/DeleteConfirmDialog";
import { useSavedSets } from "@/hooks/useSavedSets";
import { deleteNumberSet, parseRoundNo, type SavedSet, canDeleteSavedNumbers } from "@/utils/savedNumbers";
import {
  filterSavedBySource,
  type SlipSourceId,
} from "@/utils/slipSources";

interface SavedSourceListProps {
  source: Exclude<SlipSourceId, "mypicks">;
  title?: string;
  /** subLabel이 일치하는 저장분만 표시 */
  subLabel?: string;
  /** 저장 직후 목록 갱신 전에 바로 보여줄 항목 */
  pendingSet?: SavedSet | null;
}

function groupByRound(sets: SavedSet[]): Array<[string, SavedSet[]]> {
  const groups = new Map<string, SavedSet[]>();
  for (const s of sets) {
    const arr = groups.get(s.roundTag) ?? [];
    arr.push(s);
    groups.set(s.roundTag, arr);
  }
  return Array.from(groups.entries())
    .map(([roundTag, list]) => [
      roundTag,
      [...list].sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      ),
    ] as [string, SavedSet[]])
    .sort((a, b) => (parseRoundNo(b[0]) ?? 0) - (parseRoundNo(a[0]) ?? 0));
}

const SLOT_LABELS = ["A", "B", "C", "D", "E"] as const;

function SavedRoundGroup({
  roundTag,
  savedList,
  defaultOpen,
  onDelete,
  canDelete,
}: {
  roundTag: string;
  savedList: SavedSet[];
  defaultOpen: boolean;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const totalGames = savedList.reduce((sum, s) => sum + s.sets.length, 0);

  return (
    <section className="content-round">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="content-round__head"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <span className="content-round__title">{roundTag}</span>
          <p className="content-round__meta">
            {savedList.length}건 · {totalGames}게임
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-6 h-6 text-gray-500 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-500 shrink-0" aria-hidden />
        )}
      </button>

      {open ? (
        <div className="content-round__body">
          {savedList.map((saved) => (
            <article key={saved.id} className="content-set saved-set-card">
              <div className="content-set__head">
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900 truncate">
                    {saved.subLabel ?? "저장 번호"}
                  </p>
                  <p className="text-base font-semibold text-muted-readable mt-0.5">
                    {saved.sets.length}게임
                  </p>
                </div>
                {canDelete ? (
                  <div className="content-set__actions">
                    <DeleteActionButton
                      size="default"
                      confirmTitle="저장 번호 삭제"
                      confirmMessage="저장된 번호를 삭제할까요? 삭제하면 되돌릴 수 없습니다."
                      onConfirm={() => onDelete(saved.id)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="saved-set-card__body">
                <ul className="content-rows">
                  {saved.sets.map((g, i) => {
                    const slotLabel = SLOT_LABELS[i] ?? String(i + 1);
                    return (
                      <li key={`${saved.id}-${i}`} className="content-row content-row--slip">
                        <SlipBallRow
                          game={{
                            numbers: g.numbers,
                            mode: "M",
                          }}
                          slotLabel={slotLabel}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function SavedSourceList({
  source,
  title = "저장된 번호",
  subLabel,
  pendingSet = null,
}: SavedSourceListProps) {
  const { sets, refresh } = useSavedSets();
  const canDelete = canDeleteSavedNumbers();
  const mine = useMemo(() => {
    let list = filterSavedBySource(sets, source);
    if (subLabel) list = list.filter((s) => s.subLabel === subLabel);
    return list;
  }, [sets, source, subLabel]);
  const displaySets = useMemo(() => {
    if (!pendingSet) return mine;
    if (subLabel && pendingSet.subLabel !== subLabel) return mine;
    if (mine.some((s) => s.id === pendingSet.id)) return mine;
    return [pendingSet, ...mine];
  }, [mine, pendingSet, subLabel]);
  const grouped = useMemo(() => groupByRound(displaySets), [displaySets]);
  const latestRoundTag = grouped[0]?.[0] ?? null;
  const totalGames = useMemo(
    () => displaySets.reduce((sum, s) => sum + s.sets.length, 0),
    [displaySets],
  );

  async function handleDeleteSet(setId: string) {
    const result = await deleteNumberSet(setId);
    if (!result.ok) return;
    await refresh();
  }

  if (displaySets.length === 0) {
    return (
      <PageCard className="text-center">
        <p className="text-lg font-bold text-gray-800">{title}</p>
        <p className="text-base text-muted-readable mt-2">아직 저장된 번호가 없습니다</p>
      </PageCard>
    );
  }

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="page-section-title">{title}</h3>
        <span className="text-base font-semibold text-muted-readable shrink-0">
          {grouped.length}회차 · {totalGames}게임
        </span>
      </div>
      <div>
        {grouped.map(([roundTag, savedList]) => (
          <SavedRoundGroup
            key={roundTag}
            roundTag={roundTag}
            savedList={savedList}
            defaultOpen={roundTag === latestRoundTag}
            onDelete={(id) => void handleDeleteSet(id)}
            canDelete={canDelete}
          />
        ))}
      </div>
    </section>
  );
}
