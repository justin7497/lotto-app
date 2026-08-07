/**
 * 발급완료(QR 슬립) 번호 대상 기기 FCM 당첨 알림
 *
 * Firestore: devices/{deviceId}/issuedTickets, devices/{deviceId}.fcmToken
 *
 * 환경 변수: FIREBASE_SERVICE_ACCOUNT_JSON
 *
 * 사용: node scripts/notify-device-wins.mjs [--drw-no=1235] [--dry-run]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { checkWin } from "./lib/winCheck.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const APP_URL = "https://lotto-app-ljh.web.app/win-notifications";

const MIN_RANK = 5;

function parseArgs(argv) {
  let drwNo = null;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--drw-no=")) drwNo = parseInt(arg.split("=")[1], 10);
  }
  return { drwNo, dryRun };
}

function loadLatestRound(requestedDrwNo) {
  const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("lottoData.json is empty");
  }
  const byNo = new Map(rows.map((r) => [r.drwNo, r]));
  const latestDrwNo = Math.max(...rows.map((r) => r.drwNo));
  const drwNo = requestedDrwNo ?? latestDrwNo;
  const round = byNo.get(drwNo);
  if (!round) throw new Error(`Round ${drwNo} not found in lottoData.json`);
  return { round, drwNo };
}

function initFirebase() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const raw = inline?.trim() || (credPath ? readFileSync(resolve(credPath), "utf8") : null);
  if (!raw) return null;
  const serviceAccount = JSON.parse(raw);
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  return {
    db: getFirestore(),
    messaging: getMessaging(),
  };
}

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

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {number} drwNo
 */
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

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} deviceId
 * @param {number} drwNo
 */
async function alreadyNotified(db, deviceId, drwNo) {
  const snap = await db.doc(`devices/${deviceId}/winNotificationLog/${drwNo}`).get();
  return snap.exists;
}

function collectWins(tickets, round, drwNo) {
  /** @type {Array<{ ticketId: string, gameIndex: number, numbers: number[], rank: number, label: string }>} */
  const wins = [];

  for (const ticket of tickets) {
    for (const game of ticket.games) {
      const tagDrwNo = drwNo;
      if (tagDrwNo !== drwNo) continue;
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

export async function notifyDeviceWins(options = {}) {
  const { drwNo: requestedDrwNo = null, dryRun = false } = options;
  const { round, drwNo } = loadLatestRound(requestedDrwNo);

  console.log(`Device win push for round ${drwNo} (${round.drwNoDate})...`);

  const firebase = initFirebase();
  if (!firebase) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping device win push.");
    return { skipped: true, reason: "no-firebase" };
  }

  const { db, messaging } = firebase;
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
        webpush: {
          fcmOptions: { link: APP_URL },
        },
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

      if (result.failureCount > 0 && result.responses[0]?.error?.code === "messaging/registration-token-not-registered") {
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
    `Done. devices=${byDevice.size}, notified=${notified}, skipped=${skipped}, noWins=${noWins}`,
  );
  return { drwNo, notified, skipped, noWins, devices: byDevice.size };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  notifyDeviceWins(args).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
