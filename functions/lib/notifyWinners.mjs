/**
 * 로그인 사용자 저장번호 대상 — 당첨 이메일·FCM
 * round는 호출측에서 전달 (Hosting 번들 JSON 불필요)
 */
import { Resend } from "resend";
import { checkWin, parseRoundNo } from "./winCheck.mjs";
import { buildWinNotificationHtml } from "./winEmailHtml.mjs";

const APP_URL = "https://lotto-app-ljh.web.app/my-numbers";

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
  return [1, 2, 3, 4, 5]
    .filter((r) => byRank[r])
    .map((r) => `${r}등 ${byRank[r]}건`)
    .join(", ");
}

function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h << 5) - h + token.charCodeAt(i);
    h |= 0;
  }
  return `t${Math.abs(h)}`;
}

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

async function alreadyNotified(db, uid, drwNo) {
  const snap = await db.doc(`users/${uid}/notificationLog/${drwNo}`).get();
  return snap.exists;
}

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

/**
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth,
 *   messaging: import('firebase-admin/messaging').Messaging,
 *   round: { drwNo: number, drwNoDate: string, drwtNo1: number, drwtNo2: number, drwtNo3: number, drwtNo4: number, drwtNo5: number, drwtNo6: number, bnusNo: number },
 *   resendApiKey?: string,
 *   resendFromEmail?: string,
 *   dryRun?: boolean,
 * }} options
 */
export async function notifyWinners(options) {
  const {
    db,
    auth,
    messaging,
    round,
    resendApiKey = "",
    resendFromEmail = "onboarding@resend.dev",
    dryRun = false,
  } = options;

  if (!round?.drwNo) {
    return { skipped: true, reason: "no-round" };
  }

  const drwNo = round.drwNo;
  console.log(`notifyWinners: round ${drwNo} (${round.drwNoDate})...`);

  const resend = resendApiKey ? { client: new Resend(resendApiKey), fromEmail: resendFromEmail } : null;
  if (!resend && !dryRun) {
    console.warn("notifyWinners: RESEND_API_KEY missing — email disabled");
  }

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
              webpush: { fcmOptions: { link: APP_URL } },
              data: { drwNo: String(drwNo), link: APP_URL },
            });
            pushSent = result.successCount > 0;
            console.log(`  push sent → ${uid}: ${result.successCount}/${tokens.length} ok`);
            if (result.failureCount > 0) {
              result.responses.forEach((resp, i) => {
                if (!resp.success) {
                  db.doc(`users/${uid}/fcmTokens/${hashToken(tokens[i])}`)
                    .delete()
                    .catch(() => {});
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

  console.log(`notifyWinners done. notified=${notified}, skipped=${skipped}, noWins=${noWins}`);
  return { drwNo, notified, skipped, noWins };
}
