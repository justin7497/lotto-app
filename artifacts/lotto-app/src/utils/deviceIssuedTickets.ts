import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { loadFavoritePicks } from "@/utils/favoriteNumbers";
import { getRoundTag, loadSavedSets, parseRoundNo } from "@/utils/savedNumbers";
import type { SlipGame } from "@/utils/slipDraft";

export interface IssuedTicketGame {
  numbers: number[];
  gameIndex: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function extractTicketGames(sheet: SlipGame[]): IssuedTicketGame[] {
  return sheet
    .map((game, gameIndex) => ({ game, gameIndex }))
    .filter(({ game }) => Array.isArray(game.numbers) && game.numbers.length === 6)
    .map(({ game, gameIndex }) => ({
      numbers: [...game.numbers].sort((a, b) => a - b),
      gameIndex,
    }));
}

async function resolveRoundTagForSheet(sheet: SlipGame[]): Promise<string> {
  const linked = sheet.find((game) => game.savedSetId || game.favoritePickId);
  if (linked?.savedSetId) {
    const saved = (await loadSavedSets()).find((row) => row.id === linked.savedSetId);
    if (saved?.roundTag) return saved.roundTag;
  }
  if (linked?.favoritePickId) {
    const pick = (await loadFavoritePicks()).find((row) => row.id === linked.favoritePickId);
    if (pick?.roundTag) return pick.roundTag;
  }
  return getRoundTag();
}

/**
 * QR 슬립 「발급완료」 시 해당 장의 번호를 devices/{deviceId}/issuedTickets 에 등록합니다.
 * 추첨 후 notify-device-wins.mjs 가 FCM 당첨 알림을 보냅니다.
 */
export async function syncIssuedTicketSheet(sheet: SlipGame[]): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const anchorId = sheet[0]?.id;
  if (!anchorId) return;

  const games = extractTicketGames(sheet);
  if (games.length === 0) return;

  const roundTag = await resolveRoundTagForSheet(sheet);
  const drwNo = parseRoundNo(roundTag);
  if (!drwNo) return;

  const deviceId = getOrCreateDeviceId();
  const issuedAt = nowIso();

  await setDoc(
    doc(db, "devices", deviceId, "issuedTickets", anchorId),
    {
      deviceId,
      ticketId: anchorId,
      drwNo,
      roundTag,
      games,
      issuedAt,
      updatedAt: issuedAt,
    },
    { merge: true },
  );
}
