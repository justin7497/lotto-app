import { loadSlipDraft, type SlipGame, type SlipSheet } from "@/utils/slipDraft";

const STORAGE_KEY = "lotto_win_history_archive_v1";

function isValidGame(g: unknown): g is SlipGame {
  if (!g || typeof g !== "object") return false;
  const row = g as SlipGame;
  if (typeof row.id !== "string" || !Array.isArray(row.numbers)) return false;
  if (row.numbers.length !== 6) return false;
  return row.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45);
}

function isValidSheet(sheet: unknown): sheet is SlipSheet {
  return Array.isArray(sheet) && sheet.length > 0 && sheet.every(isValidGame);
}

function loadArchiveSheets(): SlipSheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { sheets?: unknown };
    if (!Array.isArray(data.sheets)) return [];
    return data.sheets.filter(isValidSheet);
  } catch {
    return [];
  }
}

function saveArchiveSheets(sheets: SlipSheet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheets }));
}

/** 발급완료 슬립을 전광판용으로 영구 보관 (슬립지 삭제와 무관) */
export function archivePrintDoneSheet(sheet: SlipSheet): void {
  const anchorId = sheet[0]?.id;
  if (!anchorId) return;

  const copy = sheet.map((game) => ({ ...game }));
  const sheets = loadArchiveSheets();
  const index = sheets.findIndex((row) => row[0]?.id === anchorId);
  if (index >= 0) sheets[index] = copy;
  else sheets.push(copy);
  saveArchiveSheets(sheets);
}

export function getArchivedPrintDoneSheets(): SlipSheet[] {
  return loadArchiveSheets();
}

/** 아직 슬립 초안에 남아 있는 발급완료 장 → 보관함으로 복사 */
export function backfillArchiveFromSlipDraft(
  draft: ReturnType<typeof loadSlipDraft> = loadSlipDraft(),
): number {
  const doneIds = new Set(draft.printDoneSheetIds ?? []);
  if (doneIds.size === 0) return 0;

  const archivedIds = new Set(
    loadArchiveSheets()
      .map((sheet) => sheet[0]?.id)
      .filter((id): id is string => Boolean(id)),
  );

  let added = 0;
  const store = draft.issuedSheets ?? { regular: [], fixed: [] };
  const liveSheets = [...store.regular, ...store.fixed];
  for (const sheet of liveSheets) {
    const anchorId = sheet[0]?.id;
    if (!anchorId || !doneIds.has(anchorId) || archivedIds.has(anchorId)) continue;
    archivePrintDoneSheet(sheet);
    archivedIds.add(anchorId);
    added += 1;
  }
  return added;
}
