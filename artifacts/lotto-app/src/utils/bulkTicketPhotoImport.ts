import {
  filterActiveImportGames,
  parseImportQr,
  saveImportedToMyNumbers,
  type ImportGame,
} from "@/utils/importNumbers";
import { decodeQrFromImageFile, formatQrImageError } from "@/utils/qrImageDecoder";

export const MAX_BULK_TICKET_PHOTOS = 40;

export type BulkPhotoItemStatus = "pending" | "processing" | "ok" | "error";

export interface BulkPhotoParsedTicket {
  source: "ticket" | "eslip";
  roundTag: string;
  sourceLabel: string;
  games: ImportGame[];
  gameCount: number;
}

export interface BulkPhotoImportItem {
  id: string;
  fileName: string;
  previewUrl: string;
  status: BulkPhotoItemStatus;
  error?: string;
  ticket?: BulkPhotoParsedTicket;
}

export type BulkSaveSummary = {
  savedTickets: number;
  savedGames: number;
  skipped: number;
  errors: string[];
};

function newItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBulkPhotoItems(files: File[]): BulkPhotoImportItem[] {
  return files.slice(0, MAX_BULK_TICKET_PHOTOS).map((file) => ({
    id: newItemId(),
    fileName: file.name,
    previewUrl: URL.createObjectURL(file),
    status: "pending",
  }));
}

export function revokeBulkPhotoPreviews(items: BulkPhotoImportItem[]): void {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export async function processTicketPhotoFile(file: File): Promise<{
  ok: true;
  ticket: BulkPhotoParsedTicket;
} | {
  ok: false;
  error: string;
}> {
  try {
    const raw = await decodeQrFromImageFile(file);
    const parsed = parseImportQr(raw);
    if (!parsed.ok) {
      return { ok: false, error: parsed.message };
    }

    const games = filterActiveImportGames(parsed.games);
    if (games.length === 0) {
      return { ok: false, error: "저장할 번호가 없습니다." };
    }

    return {
      ok: true,
      ticket: {
        source: parsed.source,
        roundTag: parsed.roundTag,
        sourceLabel:
          parsed.source === "ticket" ? "발행 티켓 QR" : "모바일 슬립 QR",
        games,
        gameCount: games.length,
      },
    };
  } catch (error) {
    return { ok: false, error: formatQrImageError(error) };
  }
}

export async function processBulkPhotoFiles(
  files: File[],
  onItemUpdate: (index: number, patch: Partial<BulkPhotoImportItem>) => void,
): Promise<void> {
  const batch = files.slice(0, MAX_BULK_TICKET_PHOTOS);
  for (let index = 0; index < batch.length; index++) {
    onItemUpdate(index, { status: "processing" });
    const result = await processTicketPhotoFile(batch[index]);
    if (result.ok) {
      onItemUpdate(index, { status: "ok", ticket: result.ticket, error: undefined });
    } else {
      onItemUpdate(index, { status: "error", error: result.error, ticket: undefined });
    }
  }
}

export async function saveBulkImportedTickets(
  tickets: BulkPhotoParsedTicket[],
): Promise<BulkSaveSummary> {
  let savedTickets = 0;
  let savedGames = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const ticket of tickets) {
    const { saved, error } = await saveImportedToMyNumbers(
      ticket.games,
      ticket.roundTag,
    );
    if (saved > 0) {
      savedTickets += 1;
      savedGames += saved;
      continue;
    }
    skipped += 1;
    if (error) {
      errors.push(`${ticket.roundTag}: ${error}`);
    }
  }

  return { savedTickets, savedGames, skipped, errors };
}
