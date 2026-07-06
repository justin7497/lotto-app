/**
 * 새 회차 추첨 후 당첨 사용자에게 이메일·푸시 알림을 발송합니다.
 *
 * 환경 변수:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  - Firebase 서비스 계정 JSON (전체)
 *   RESEND_API_KEY                 - Resend API 키
 *   RESEND_FROM_EMAIL              - 발신 이메일 (선택)
 *
 * 사용: node scripts/notify-winners.mjs [--drw-no=1231] [--dry-run]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { Resend } from "resend";
import { checkWin, parseRoundNo } from "./lib/winCheck.mjs";
import { buildWinNotificationHtml } from "./lib/winEmailHtml.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "artifacts/lotto-app/src/data/lottoData.json");
const APP_URL = "https://lotto-app-ljh.web.app/my-numbers";

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
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const serviceAccount = JSON.parse(raw);
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  return {
    db: getFirestore(),
    auth: getAuth(),
    messaging: getMessaging(),
  };
}

function initResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  return { client: new Resend(apiKey), fromEmail };
}

function defaultSettings() {
  return { emailEnabled: false, pushEnabled: false, minRank: 5 };
}

function meetsMinRank(rank, minRank) {
  return rank !== null && rank <= minRank;
}

function summarizeWins(wins) {
  const byRank = {};
  for (const w of wins) {
    byRank[w.rank] = (byRank[w.rank] ?? 0) + 1;
  }
  const parts = [1, 2, 3, 4, 5]
    .filter((r) => byRank[r])
    .map((r) => `${r}등 ${byRank[r]}건`);
  return parts.join(", ");
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function loadUserSavedSets(db) {
  const snap = await db.collectionGroup("savedNumbers").get();
  /** @type {Map<string, Array<{ id: string, roundTag: string, subLabel?: string | null, sets: Array<{ numbers: number[] }> }>>} */
  const byUser = new Map();

  for (const doc of snap.docs) {
    const userId = doc.ref.parent.parent?.id;
    if (!userId) continue;
    const data = doc.data();
    const sets = Array.isArray(data.sets) ? data.sets : [];
    const entry = {
      id: String(data.id ?? doc.id),
      roundTag: String(data.roundTag ?? ""),
      subLabel: data.subLabel ?? null,
      sets: sets
        .filter((s) => s && Array.isArray(s.numbers) && s.numbers.length === 6)
        .map((s) => ({ numbers: s.numbers.map(Number) })),
    };
    if (entry.sets.length === 0) continue;
    const list = byUser.get(userId) ?? [];
    list.push(entry);
    byUser.set(userId, list);
  }
  return byUser;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 */
async function loadSettings(db, uid) {
  const snap = await db.doc(`users/${uid}/settings/notifications`).get();
  if (!snap.exists) return defaultSettings();
  const data = snap.data() ?? {};
  return {
    emailEnabled: Boolean(data.emailEnabled),
    pushEnabled: Boolean(data.pushEnabled),
    minRank: typeof data.minRank === "number" ? data.minRank : 5,
  };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 * @param {number} drwNo
 */
async function alreadyNotified(db, uid, drwNo) {
  const snap = await db.doc(`users/${uid}/notificationLog/${drwNo}`).get();
  return snap.exists;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} uid
 */
async function loadFcmTokens(db, uid) {
  const snap = await db.collection(`users/${uid}/fcmTokens`).get();
  return snap.docs.map((d) => String(d.data().token ?? "")).filter(Boolean);
}

function collectWins(savedSets, round, drwNo, minRank) {
  /** @type {Array<{ roundTag: string, subLabel?: string | null, gameIndex: number, numbers: number[], rank: number, label: string }>} */
  const wins = [];

  for (const saved of savedSets) {
    if (parseRoundNo(saved.roundTag) !== drwNo) continue;
    saved.sets.forEach((game, idx) => {
      const result = checkWin(game.numbers, round);
      if (result.rank !== null && meetsMinRank(result.rank, minRank)) {
        wins.push({
          roundTag: saved.roundTag,
          subLabel: saved.subLabel,
          gameIndex: idx + 1,
          numbers: game.numbers,
          rank: result.rank,
          label: result.label,
        });
      }
    });
  }

  wins.sort((a, b) => a.rank - b.rank || a.gameIndex - b.gameIndex);
  return wins;
}

export async function notifyWinners(options = {}) {
  const { drwNo: requestedDrwNo = null, dryRun = false } = options;
  const { round, drwNo } = loadLatestRound(requestedDrwNo);

  console.log(`Checking wins for round ${drwNo} (${round.drwNoDate})...`);

  const firebase = initFirebase();
  if (!firebase) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping notifications.");
    return { skipped: true, reason: "no-firebase" };
  }

  const resend = initResend();
  if (!resend && !dryRun) {
    console.warn("RESEND_API_KEY not set — email notifications disabled.");
  }

  const { db, auth, messaging } = firebase;
  const byUser = await loadUserSavedSets(db);

  let notified = 0;
  let skipped = 0;
  let noWins = 0;

  for (const [uid, savedSets] of byUser.entries()) {
    const settings = await loadSettings(db, uid);
    if (!settings.emailEnabled && !settings.pushEnabled) {
      skipped += 1;
      continue;
    }

    const wins = collectWins(savedSets, round, drwNo, settings.minRank);
    if (wins.length === 0) {
      noWins += 1;
      continue;
    }

    if (await alreadyNotified(db, uid, drwNo)) {
      console.log(`  skip ${uid}: already notified for ${drwNo}`);
      skipped += 1;
      continue;
    }

    let userEmail = null;
    try {
      const user = await auth.getUser(uid);
      userEmail = user.email ?? null;
    } catch {
      console.warn(`  skip ${uid}: auth user not found`);
      skipped += 1;
      continue;
    }

    const summary = summarizeWins(wins);
    const bestRank = Math.min(...wins.map((w) => w.rank));
    let emailSent = false;
    let pushSent = false;

    if (settings.emailEnabled && userEmail && resend) {
      const html = buildWinNotificationHtml({
        drwNo,
        drwNoDate: round.drwNoDate,
        round,
        wins,
      });

      if (dryRun) {
        console.log(`  [dry-run] email → ${userEmail}: ${summary}`);
        emailSent = true;
      } else {
        const { error } = await resend.client.emails.send({
          from: resend.fromEmail,
          to: userEmail,
          subject: `🎉 로또 당첨 알림 — 제${drwNo}회 ${summary}`,
          html,
        });
        if (error) {
          console.error(`  email failed for ${uid}:`, error.message);
        } else {
          emailSent = true;
          console.log(`  email sent → ${userEmail}: ${summary}`);
        }
      }
    }

    if (settings.pushEnabled) {
      const tokens = await loadFcmTokens(db, uid);
      if (tokens.length > 0) {
        const title =
          bestRank <= 3
            ? `🎉 제${drwNo}회 ${bestRank}등 당첨!`
            : `✨ 제${drwNo}회 당첨 (${summary})`;
        const body = wins.length === 1 ? wins[0].label : `${wins.length}게임 당첨 — ${summary}`;

        if (dryRun) {
          console.log(`  [dry-run] push → ${uid} (${tokens.length} tokens): ${title}`);
          pushSent = true;
        } else {
          try {
            const result = await messaging.sendEachForMulticast({
              tokens,
              notification: { title, body },
              webpush: {
                fcmOptions: { link: APP_URL },
              },
              data: {
                drwNo: String(drwNo),
                link: APP_URL,
              },
            });
            pushSent = result.successCount > 0;
            console.log(`  push sent → ${uid}: ${result.successCount}/${tokens.length} ok`);
            if (result.failureCount > 0) {
              result.responses.forEach((resp, i) => {
                if (!resp.success) {
                  const badToken = tokens[i];
                  db.doc(`users/${uid}/fcmTokens/${hashToken(badToken)}`).delete().catch(() => {});
                }
              });
            }
          } catch (err) {
            console.error(`  push failed for ${uid}:`, err instanceof Error ? err.message : err);
          }
        }
      }
    }

    if (!dryRun && (emailSent || pushSent)) {
      await db.doc(`users/${uid}/notificationLog/${drwNo}`).set({
        drwNo,
        sentAt: new Date().toISOString(),
        emailSent,
        pushSent,
        winCount: wins.length,
        bestRank,
        summary,
      });
      notified += 1;
    } else if (dryRun) {
      notified += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(`Done. notified=${notified}, skipped=${skipped}, noWins=${noWins}`);
  return { drwNo, notified, skipped, noWins };
}

function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h << 5) - h + token.charCodeAt(i);
    h |= 0;
  }
  return `t${Math.abs(h)}`;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  notifyWinners(args).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
