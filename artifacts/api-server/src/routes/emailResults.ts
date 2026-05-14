import { Router, type IRouter } from "express";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { savedNumbersTable, lottoRoundsTable } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";
import type { LottoRoundRow } from "@workspace/db/schema";

const router: IRouter = Router();

function getResendClient(): { client: Resend; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY가 설정되지 않았습니다");
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  return { client: new Resend(apiKey), fromEmail };
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number");
}

function parseSets(raw: unknown): Array<{ numbers: number[] }> {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (
      item !== null &&
      typeof item === "object" &&
      "numbers" in item &&
      isNumberArray((item as Record<string, unknown>).numbers)
    ) {
      return [{ numbers: (item as { numbers: number[] }).numbers }];
    }
    return [];
  });
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "이메일 발송 중 오류가 발생했습니다";
}

function localizeResendError(msg: string): string {
  if (msg.includes("only send testing emails to your own email address")) {
    const m = msg.match(/\(([^)]+)\)/);
    const owner = m ? m[1] : "Resend 계정 이메일";
    return `도메인 미인증 상태에서는 Resend 계정 이메일(${owner})로만 발송할 수 있습니다.`;
  }
  if (msg.includes("domain is not verified")) {
    return "발신 도메인이 인증되지 않았습니다. resend.com/domains에서 도메인을 인증해 주세요.";
  }
  if (msg.includes("API key is invalid")) {
    return "Resend API 키가 유효하지 않습니다. 키를 확인해 주세요.";
  }
  return msg;
}

function checkWin(
  numbers: number[],
  round: LottoRoundRow
): { rank: number | null; label: string; color: string } {
  const winning = [
    round.drwtNo1,
    round.drwtNo2,
    round.drwtNo3,
    round.drwtNo4,
    round.drwtNo5,
    round.drwtNo6,
  ];
  const matchCount = numbers.filter((n) => winning.includes(n)).length;
  const bonusMatch = numbers.includes(round.bnusNo);

  if (matchCount === 6) return { rank: 1, label: "1등 🎉", color: "#b45309" };
  if (matchCount === 5 && bonusMatch) return { rank: 2, label: "2등 ✨", color: "#ea580c" };
  if (matchCount === 5) return { rank: 3, label: "3등 🥳", color: "#7c3aed" };
  if (matchCount === 4) return { rank: 4, label: "4등", color: "#2563eb" };
  if (matchCount === 3) return { rank: 5, label: "5등", color: "#059669" };
  return { rank: null, label: `${matchCount}개 일치 낙첨`, color: "#9ca3af" };
}

function ballBg(n: number): string {
  if (n <= 10) return "#f59e0b";
  if (n <= 20) return "#3b82f6";
  if (n <= 30) return "#ef4444";
  if (n <= 40) return "#6b7280";
  return "#22c55e";
}

function buildEmailHtml(
  rows: Array<{
    roundTag: string;
    sets: Array<{ numbers: number[] }>;
    round: LottoRoundRow | null;
  }>
): string {
  const setCards = rows.map(({ roundTag, sets, round }) => {
    const winningNums = round
      ? [round.drwtNo1, round.drwtNo2, round.drwtNo3, round.drwtNo4, round.drwtNo5, round.drwtNo6]
      : [];

    const setRows = sets
      .map((s, idx) => {
        const win = round ? checkWin(s.numbers, round) : null;
        const balls = s.numbers
          .map(
            (n) =>
              `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:${ballBg(n)};color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:26px;margin:2px;">${n}</span>`
          )
          .join("");
        const winBadge = win
          ? `<span style="font-size:11px;font-weight:600;color:${win.color};white-space:nowrap;">${win.label}</span>`
          : `<span style="font-size:11px;color:#d1d5db;">결과 대기</span>`;

        return `<tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:6px 8px;font-size:12px;color:#9ca3af;width:24px;">${idx + 1}</td>
          <td style="padding:6px 4px;">${balls}</td>
          <td style="padding:6px 8px;text-align:right;">${winBadge}</td>
        </tr>`;
      })
      .join("");

    const winningRow = round
      ? `<tr style="background:#fffbeb;">
          <td colspan="3" style="padding:8px 8px 4px;font-size:11px;color:#92400e;font-weight:600;">당첨 번호 (${round.drwNoDate})</td>
        </tr>
        <tr style="background:#fffbeb;">
          <td colspan="3" style="padding:0 8px 10px;">
            ${winningNums
              .map(
                (n) =>
                  `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:${ballBg(n)};color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:26px;margin:2px;">${n}</span>`
              )
              .join("")}
            <span style="display:inline-block;margin:2px;font-size:11px;color:#9ca3af;">+</span>
            <span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:transparent;border:2px solid ${ballBg(round.bnusNo)};color:${ballBg(round.bnusNo)};font-size:11px;font-weight:700;text-align:center;line-height:22px;margin:2px;">${round.bnusNo}</span>
          </td>
        </tr>`
      : "";

    return `<div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:16px;overflow:hidden;">
      <div style="background:#fffaf0;padding:10px 14px;border-bottom:1px solid #fed7aa;">
        <span style="font-size:13px;font-weight:700;color:#92400e;">📅 ${roundTag}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${setRows}
        ${winningRow}
      </table>
    </div>`;
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Apple SD Gothic Neo,Noto Sans KR,Arial,sans-serif;">
  <div style="max-width:520px;margin:24px auto;padding:0 12px;">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">🎱 로또 당첨 결과</div>
      <div style="font-size:13px;color:#fef3c7;margin-top:6px;">나의 번호 분석 리포트</div>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:20px;border:1px solid #e5e7eb;border-top:none;">
      ${setCards.join("")}
      <div style="text-align:center;font-size:11px;color:#d1d5db;margin-top:20px;line-height:1.6;">
        이 메일은 <strong>로또 분석·예측</strong> 앱에서 발송되었습니다.<br/>
        통계 기반 분석이며 당첨을 보장하지 않습니다.
      </div>
    </div>
  </div>
</body>
</html>`;
}

type FilterParam =
  | { type: "all" }
  | { type: "recent"; count: number }
  | { type: "round"; roundTag: string }
  | { type: "ids"; savedIds: string[] };

function parseFilter(raw: unknown): FilterParam {
  if (raw === null || typeof raw !== "object") return { type: "all" };
  const obj = raw as Record<string, unknown>;
  if (obj.type === "recent" && typeof obj.count === "number" && obj.count > 0) {
    return { type: "recent", count: obj.count };
  }
  if (obj.type === "round" && typeof obj.roundTag === "string" && obj.roundTag.length > 0) {
    return { type: "round", roundTag: obj.roundTag };
  }
  if (obj.type === "ids" && Array.isArray(obj.savedIds)) {
    return { type: "ids", savedIds: obj.savedIds.filter((x) => typeof x === "string") };
  }
  return { type: "all" };
}

router.post("/send-results", async (req, res) => {
  const body: unknown = req.body;
  const bodyObj =
    body !== null && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const email = bodyObj.email;
  if (typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "유효한 이메일 주소를 입력해주세요" });
    return;
  }

  const filter = parseFilter(bodyObj.filter);

  try {
    let savedRows = await db.select().from(savedNumbersTable);
    if (savedRows.length === 0) {
      res.status(400).json({ error: "저장된 번호가 없습니다" });
      return;
    }

    if (filter.type === "recent") {
      savedRows = [...savedRows]
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        .slice(0, filter.count);
    } else if (filter.type === "round") {
      savedRows = savedRows.filter((row) => row.roundTag === filter.roundTag);
    } else if (filter.type === "ids") {
      const idSet = new Set(filter.savedIds);
      savedRows = savedRows.filter((row) => idSet.has(row.id));
    }

    if (savedRows.length === 0) {
      res.status(400).json({ error: "선택한 조건에 해당하는 번호가 없습니다" });
      return;
    }

    const roundNos = savedRows.flatMap((row) => {
      const match = String(row.roundTag).match(/제(\d+)회/);
      return match ? [parseInt(match[1], 10)] : [];
    });

    const uniqueRoundNos = [...new Set(roundNos)];
    const lotteryRounds =
      uniqueRoundNos.length > 0
        ? await db
            .select()
            .from(lottoRoundsTable)
            .where(inArray(lottoRoundsTable.drwNo, uniqueRoundNos))
        : [];

    const roundMap = new Map<number, LottoRoundRow>(lotteryRounds.map((r) => [r.drwNo, r]));

    const emailRows = savedRows.map((row) => {
      const sets = parseSets(row.sets);
      const match = String(row.roundTag).match(/제(\d+)회/);
      const roundNo = match ? parseInt(match[1], 10) : null;
      return {
        roundTag: String(row.roundTag),
        sets,
        round: roundNo !== null ? (roundMap.get(roundNo) ?? null) : null,
      };
    });

    const { client, fromEmail } = getResendClient();
    const { error } = await client.emails.send({
      from: fromEmail,
      to: email,
      subject: `🎱 로또 당첨 결과 리포트 — ${new Date().toLocaleDateString("ko-KR")}`,
      html: buildEmailHtml(emailRows),
    });

    if (error) {
      console.error("Resend error:", error);
      res.status(500).json({ error: localizeResendError(error.message ?? "") });
      return;
    }

    res.json({ ok: true, to: email });
  } catch (err: unknown) {
    console.error("send-results error:", err);
    const msg = localizeResendError(toErrorMessage(err));
    res.status(500).json({ error: msg });
  }
});

export default router;
