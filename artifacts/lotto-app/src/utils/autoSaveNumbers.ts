import type { GeneratedNumbers } from "@/data/types";
import { saveNumberSets, type SavedSet } from "@/utils/savedNumbers";

export type AutoSaveResult =
  | { status: "saved"; set: SavedSet }
  | { status: "duplicate" }
  | { status: "error"; message: string };

/** 생성 번호를 나의 로또번호에 저장 */
export async function autoSaveGeneratedSets(
  sets: GeneratedNumbers[],
  subLabel: string,
): Promise<AutoSaveResult> {
  if (sets.length === 0) {
    return { status: "error", message: "저장할 번호가 없습니다." };
  }

  const result = await saveNumberSets(sets, subLabel);
  if (result.ok) return { status: "saved", set: result.set };
  if (result.error.includes("이미 저장")) return { status: "duplicate" };
  return { status: "error", message: result.error };
}
