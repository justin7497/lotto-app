/**
 * 토요 추첨 직후 알림 체인 (당첨 메일/푸시 → 기기 당첨 → 추첨후 참여)
 * 사용자·기기별 로그로 중복 발송을 막으며, 회차 단위 notifiedDrwNo로 재실행을 제어한다.
 */
import { notifyWinners } from "./notifyWinners.mjs";
import { notifyDeviceWins } from "./notifyDeviceWins.mjs";
import { notifyEngagement } from "./notifyEngagement.mjs";

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
export async function runPostDrawNotifications(options) {
  const {
    db,
    auth,
    messaging,
    round,
    resendApiKey = "",
    resendFromEmail = "onboarding@resend.dev",
    dryRun = false,
  } = options;

  const winners = await notifyWinners({
    db,
    auth,
    messaging,
    round,
    resendApiKey,
    resendFromEmail,
    dryRun,
  });

  const deviceWins = await notifyDeviceWins({
    db,
    messaging,
    round,
    dryRun,
  });

  const engagement = await notifyEngagement({
    db,
    messaging,
    campaignId: "sat-post-draw",
    dryRun,
  });

  return {
    drwNo: round.drwNo,
    winners,
    deviceWins,
    engagement,
  };
}
