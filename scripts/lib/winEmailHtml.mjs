import { ballBg } from "./winCheck.mjs";

const RANK_COLOR = {
  1: "#b45309",
  2: "#ea580c",
  3: "#7c3aed",
  4: "#2563eb",
  5: "#059669",
};

/**
 * @param {{
 *   drwNo: number,
 *   drwNoDate: string,
 *   round: { drwtNo1: number, drwtNo2: number, drwtNo3: number, drwtNo4: number, drwtNo5: number, drwtNo6: number, bnusNo: number },
 *   wins: Array<{ roundTag: string, subLabel?: string | null, gameIndex: number, numbers: number[], rank: number, label: string }>
 * }} payload
 */
export function buildWinNotificationHtml(payload) {
  const { drwNo, drwNoDate, round, wins } = payload;
  const winningNums = [
    round.drwtNo1,
    round.drwtNo2,
    round.drwtNo3,
    round.drwtNo4,
    round.drwtNo5,
    round.drwtNo6,
  ];

  const rankSummary = [1, 2, 3, 4, 5]
    .map((r) => {
      const count = wins.filter((w) => w.rank === r).length;
      if (count === 0) return "";
      return `<span style="display:inline-block;margin:4px;padding:6px 12px;border-radius:8px;font-size:14px;font-weight:700;background:${RANK_COLOR[r]};color:#fff;">${r}등 ${count}건</span>`;
    })
    .filter(Boolean)
    .join("");

  const winRows = wins
    .map((w) => {
      const balls = w.numbers
        .map(
          (n) =>
            `<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${ballBg(n)};color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:28px;margin:2px;">${n}</span>`,
        )
        .join("");
      const color = RANK_COLOR[w.rank] ?? "#6b7280";
      const meta = w.subLabel ? `${w.roundTag} · ${w.subLabel}` : w.roundTag;
      return `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 8px;font-size:13px;color:#6b7280;width:28px;vertical-align:top;">${w.gameIndex}</td>
        <td style="padding:10px 4px;vertical-align:top;">${balls}</td>
        <td style="padding:10px 8px;vertical-align:top;text-align:right;">
          <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;">${meta}</div>
          <span style="font-size:14px;font-weight:700;color:${color};">${w.label}</span>
        </td>
      </tr>`;
    })
    .join("");

  const winningBalls = winningNums
    .map(
      (n) =>
        `<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${ballBg(n)};color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:28px;margin:2px;">${n}</span>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Apple SD Gothic Neo,Noto Sans KR,Arial,sans-serif;">
  <div style="max-width:520px;margin:24px auto;padding:0 12px;">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;">🎉 당첨 알림</div>
      <div style="font-size:15px;color:#fef3c7;margin-top:8px;">제${drwNo}회 (${drwNoDate}) 추첨 결과</div>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:20px;border:1px solid #e5e7eb;border-top:none;">
      <div style="text-align:center;margin-bottom:16px;">${rankSummary}</div>
      <div style="background:#fffbeb;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">당첨 번호</div>
        <div>${winningBalls}
          <span style="display:inline-block;margin:2px;font-size:12px;color:#9ca3af;">+</span>
          <span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:transparent;border:2px solid ${ballBg(round.bnusNo)};color:${ballBg(round.bnusNo)};font-size:12px;font-weight:700;text-align:center;line-height:24px;margin:2px;">${round.bnusNo}</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${winRows}
      </table>
      <div style="text-align:center;margin-top:20px;">
        <a href="https://lotto-app-ljh.web.app/my-numbers" style="display:inline-block;background:#f59e0b;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px;">추출번호에서 자세히 보기</a>
      </div>
      <div style="text-align:center;font-size:11px;color:#d1d5db;margin-top:20px;line-height:1.6;">
        당첨 알림을 켜두셔서 발송된 메일입니다.<br/>
        추출번호 페이지에서 알림 설정을 변경할 수 있습니다.
      </div>
    </div>
  </div>
</body>
</html>`;
}
