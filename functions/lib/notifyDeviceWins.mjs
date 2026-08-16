/**
 * 발급완료(QR 슬립) 기기 FCM 당첨 알림
 */
import { checkWin } from "./winCheck.mjs";

const APP_URL = "https://lotto-app-ljh.web.app/win-notifications";
const MIN_RANK = 5;

function meetsMinRank(rank, minRank) {
  return rank !== null && rank <= minRank;
}

function summarizeWins(wins) {
  const byRank = {};
  for (const w of wins) {
    byRank[w.rank] = (byRank[w.rank] ?? 0) + 1;
  }
  return [1, 2, 3, 4, 5]
    .filter((r) => byRank[r])
    .map((r) => `${r}등 ${byRank[r]}건`)
    .join(", ");
}

async function loadIssuedTicketsForRound(db, drwNo) {
  const snap = await db.collectionGroup("issuedTickets").where("drwNo", "==", drwNo).get();
  /** @type {Map<string, Array<{ ticketId: string, games: Array<{ numbers: number[], gameIndex: number }> }>>} */
  const byDevice = new Map();

  for (const docSnap of snap.docs) {
    const deviceId = docSnap.ref.parent.parent?.id;
    if (!deviceId) continue;
    const data = docSnap.data();
    const games = Array.isArray(data.games) ? data.games : [];
    const normalized = games
      .filter((g) => g && Array.isArray(g.numbers) && g.numbers.length === 6)
      .map((g) => ({
        numbers: g.numbers.map(Number),
        gameIndex: typeof g.gameIndex === "number" ? g.gameIndex : 0,
      }));
    if (normalized.length === 0) continue;

    const list = byDevice.get(deviceId) ?? [];
    list.push({ ticketId: String(data.ticketId ?? docSnap.id), games: normalized });
    byDevice.set(deviceId, list);
  }
  return byDevice;
}

async function alreadyNotified(db, deviceId, drwNo) {
  const snap = await db.doc(`devices/${deviceId}/winNotificationLog/${drwNo}`).get();
  return snap.exists;
}

function collectWins(tickets, round, drwNo) {
  /** @type {Array<{ ticketId: string, gameIndex: number, numbers: number[], rank: number, label: string }>} */
  const wins = [];

  for (const ticket of tickets) {
    for (const game of ticket.games) {
      const result = checkWin(game.numbers, round);
      if (result.rank !== null && meetsMinRank(result.rank, MIN_RANK)) {
        wins.push({
          ticketId: ticket.ticketId,
          gameIndex: game.gameIndex,
          numbers: game.numbers,
          rank: result.rank,
          label: result.label,
        });
      }
    }
  }

  wins.sort((a, b) => a.rank - b.rank || a.gameIndex - b.gameIndex);
  return wins;
}

/**
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   messaging: import('firebase-admin/messaging').Messaging,
 *   round: { drwNo: number, drwNoDate: string, drwtNo1: number, drwtNo2: number, drwtNo3: number, drwtNo4: number, drwtNo5: number, drwtNo6: number, bnusNo: number },
 *   dryRun?: boolean,
 * }} options
 */
export async function notifyDeviceWins(options) {
  const { db, messaging, round, dryRun = false } = options;

  if (!round?.drwNo) {
    return { skipped: true, reason: "no-round" };
  }

  const drwNo = round.drwNo;
  console.log(`notifyDeviceWins: round ${drwNo} (${round.drwNoDate})...`);

  const byDevice = await loadIssuedTicketsForRound(db, drwNo);
  let notified = 0;
  let skipped = 0;
  let noWins = 0;

  for (const [deviceId, tickets] of byDevice.entries()) {
    const wins = collectWins(tickets, round, drwNo);
    if (wins.length === 0) {
      noWins += 1;
      continue;
    }

    if (await alreadyNotified(db, deviceId, drwNo)) {
      console.log(`  skip ${deviceId}: already notified for ${drwNo}`);
      skipped += 1;
      continue;
    }

    const deviceSnap = await db.doc(`devices/${deviceId}`).get();
    const device = deviceSnap.data() ?? {};
    if (device.engagementPushEnabled === false) {
      skipped += 1;
      continue;
    }
    const token = typeof device.fcmToken === "string" ? device.fcmToken : "";
    if (!token) {
      console.log(`  skip ${deviceId}: no fcmToken`);
      skipped += 1;
      continue;
    }

    const summary = summarizeWins(wins);
    const bestRank = Math.min(...wins.map((w) => w.rank));
    const title =
      bestRank <= 3
        ? `🎉 제${drwNo}회 ${bestRank}등 당첨!`
        : `✨ 제${drwNo}회 당첨 (${summary})`;
    const body = wins.length === 1 ? wins[0].label : `${wins.length}게임 당첨 — ${summary}`;

    if (dryRun) {
      console.log(`  [dry-run] push → ${deviceId}: ${title}`);
      notified += 1;
      continue;
    }

    try {
      const result = await messaging.sendEachForMulticast({
        tokens: [token],
        notification: { title, body },
        webpush: { fcmOptions: { link: APP_URL } },
        data: {
          drwNo: String(drwNo),
          link: APP_URL,
          type: "device-win",
        },
      });
      const ok = result.successCount > 0;
      if (ok) {
        await db.doc(`devices/${deviceId}/winNotificationLog/${drwNo}`).set({
          drwNo,
          sentAt: new Date().toISOString(),
          success: true,
          winCount: wins.length,
          bestRank,
          summary,
        });
        console.log(`  push sent → ${deviceId}: ${title}`);
        notified += 1;
      } else {
        console.warn(`  push failed → ${deviceId}`);
        skipped += 1;
      }

      if (
        result.failureCount > 0 &&
        result.responses[0]?.error?.code === "messaging/registration-token-not-registered"
      ) {
        await db.doc(`devices/${deviceId}`).set(
          { engagementPushEnabled: false, updatedAt: new Date().toISOString() },
          { merge: true },
        );
      }
    } catch (err) {
      console.error(`  push error → ${deviceId}:`, err instanceof Error ? err.message : err);
      skipped += 1;
    }
  }

  console.log(
    `notifyDeviceWins done. devices=${byDevice.size}, notified=${notified}, skipped=${skipped}, noWins=${noWins}`,
  );
  return { drwNo, notified, skipped, noWins, devices: byDevice.size };
}
