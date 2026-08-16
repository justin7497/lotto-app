import { ArrowLeft } from "lucide-react";
import LottoBall from "@/components/LottoBall";
import type { LottoRound } from "@/data/types";
import { checkWinResult, getUserNumberHitState, type WinResult } from "@/utils/savedNumbers";
import type { DhlotteryWinQr } from "@/utils/dhlotteryQr";

const FIXED_PRIZE: Record<number, number> = {
  5: 5_000,
  4: 50_000,
  3: 1_500_000,
};

const GAME_LABELS = "ABCDE";

function formatDrawLabel(iso: string): string {
  return `${iso.replace(/-/g, ".")} 추첨`;
}

function rankBadge(result: WinResult | null): { label: string; tone: "lose" | "win" } {
  if (!result || result.rank === null) return { label: "낙첨", tone: "lose" };
  return { label: `${result.rank}등`, tone: "win" };
}

function estimateTotalPrize(games: number[][], round: LottoRound): number {
  let total = 0;
  for (const numbers of games) {
    const result = checkWinResult(numbers, round);
    if (result.rank && result.rank >= 3 && result.rank <= 5) {
      total += FIXED_PRIZE[result.rank] ?? 0;
    }
  }
  return total;
}

function hasHighRank(games: number[][], round: LottoRound): boolean {
  return games.some((numbers) => {
    const r = checkWinResult(numbers, round);
    return r.rank === 1 || r.rank === 2;
  });
}

export default function QrWinResultView({
  result,
  round,
  onBack,
  onRescan,
  embedded = false,
}: {
  result: DhlotteryWinQr;
  round: LottoRound | null;
  onBack: () => void;
  onRescan: () => void;
  embedded?: boolean;
}) {
  const winning = round
    ? [
        round.drwtNo1,
        round.drwtNo2,
        round.drwtNo3,
        round.drwtNo4,
        round.drwtNo5,
        round.drwtNo6,
      ]
    : null;

  const totalPrize = round ? estimateTotalPrize(result.games, round) : 0;
  const highRank = round ? hasHighRank(result.games, round) : false;
  const anyWin = totalPrize > 0 || highRank;

  return (
    <div className={`qr-win-page${embedded ? " qr-win-page--embedded" : ""}`}>
      {!embedded ? (
        <header className="qr-win-page__header">
          <button type="button" onClick={onBack} className="qr-win-page__back" aria-label="닫기">
            <ArrowLeft className="w-7 h-7" strokeWidth={2.5} />
          </button>
          <h1 className="qr-win-page__title">로또복권 당첨확인</h1>
        </header>
      ) : null}

      <div className="qr-win-page__body">
        <div className="qr-win-page__scroll">
          <div className="qr-win-page__round">
            <p className="qr-win-page__round-no">제{result.roundNo}회</p>
            {round ? (
              <p className="qr-win-page__round-date">{formatDrawLabel(round.drwNoDate)}</p>
            ) : (
              <p className="qr-win-page__round-date">추첨 결과 대기 중</p>
            )}
          </div>

          {round && winning ? (
            <section className="qr-win-page__draw">
              <h2 className="qr-win-page__draw-title">당첨번호</h2>
              <div className="ball-row ball-row--fluid qr-win-page__draw-balls">
                {winning.map((n) => (
                  <LottoBall key={n} number={n} size="sm" />
                ))}
                <span className="qr-win-page__plus">+</span>
                <LottoBall number={round.bnusNo} size="sm" isBonus />
              </div>
            </section>
          ) : null}

          <section className="qr-win-page__summary">
            {anyWin ? (
              <>
                {highRank ? (
                  <p className="qr-win-page__prize qr-win-page__prize--high">
                    1·2등 당첨! 판매점에서 확인하세요
                  </p>
                ) : null}
                {totalPrize > 0 ? (
                  <p className="qr-win-page__prize">
                    총 <strong>{totalPrize.toLocaleString("ko-KR")}원</strong> 당첨
                  </p>
                ) : null}
              </>
            ) : round ? (
              <p className="qr-win-page__cheer qr-win-page__cheer--muted">아쉽게도, 낙첨되었습니다.</p>
            ) : (
              <p className="qr-win-page__cheer qr-win-page__cheer--muted">추첨 후 결과를 확인할 수 있습니다.</p>
            )}
          </section>

          <section className="qr-win-page__games">
            <ul className="qr-win-page__game-list">
              {result.games.map((numbers, idx) => {
                const win = round ? checkWinResult(numbers, round) : null;
                const badge = rankBadge(win);
                const label = GAME_LABELS[idx] ?? String(idx + 1);
                const kind = result.kinds[idx];
                const typeLabel =
                  numbers.length === 0
                    ? "자동"
                    : kind === "semi" || numbers.length < 6
                      ? "반자동"
                      : "수동";

                return (
                  <li key={`${label}-${numbers.join("-")}`} className="qr-win-page__game-row">
                    <div className="qr-win-page__game-label">
                      <span className="qr-win-page__game-letter">{label}</span>
                      <span className="qr-win-page__game-type">{typeLabel}</span>
                    </div>
                    <div className="ball-row ball-row--fluid win-result-balls qr-win-page__game-balls">
                      {numbers.map((n) => {
                        const hit = round ? getUserNumberHitState(n, numbers, round) : null;
                        return (
                        <LottoBall
                          key={n}
                          number={n}
                          size="sm"
                          matched={hit === null ? null : hit.matched}
                          isBonus={hit?.isBonusHit ?? false}
                        />
                      );
                      })}
                      {numbers.length < 6 ? (
                        <span className="qr-win-page__auto-mark">+자동</span>
                      ) : null}
                    </div>
                    <span className={`qr-win-page__rank qr-win-page__rank--${badge.tone}`}>
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="qr-win-page__footer">
          <p className="qr-win-page__disclaimer">
            본 결과는 참고용이며, 최종 당첨 여부는 동행복권 공식 사이트 또는 판매점에서 확인해
            주세요. 당첨금 수령 시 실물 복권이 필요합니다.
          </p>
          <button type="button" onClick={onRescan} className="qr-win-page__rescan">
            다른 복권 QR 스캔
          </button>
        </div>
      </div>
    </div>
  );
}
