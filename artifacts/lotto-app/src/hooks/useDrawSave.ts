import { useEffect, useMemo, useState } from "react";
import type { GeneratedNumbers, LottoNumbers } from "@/data/types";
import { autoSaveGeneratedSets } from "@/utils/autoSaveNumbers";
import { DRAW_BALL_COUNT } from "@/utils/drawGame";
import { isDuplicateNumberSets, loadSavedSets } from "@/utils/savedNumbers";

export function useDrawSave(drawn: number[], subLabel: string, done: boolean) {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const game: GeneratedNumbers[] = useMemo(() => {
    if (drawn.length !== DRAW_BALL_COUNT) return [];
    const numbers = [...drawn].sort((a, b) => a - b) as LottoNumbers;
    return [{ numbers, mode: "random" }];
  }, [drawn]);

  function resetSaveState() {
    setSaved(false);
    setSaveError(null);
    setIsDuplicate(false);
  }

  async function handleSave() {
    if (game.length === 0 || saved || isDuplicate) return;
    const saveResult = await autoSaveGeneratedSets(game, subLabel);
    if (saveResult.status === "saved") {
      setSaved(true);
      return;
    }
    if (saveResult.status === "duplicate") {
      setIsDuplicate(true);
      return;
    }
    setSaveError(saveResult.message);
  }

  useEffect(() => {
    if (!done || game.length === 0) return;
    void loadSavedSets().then((existing) => {
      void isDuplicateNumberSets(game, existing).then(setIsDuplicate);
    });
  }, [done, game]);

  return {
    game,
    saved,
    saveError,
    isDuplicate,
    resetSaveState,
    handleSave,
  };
}
