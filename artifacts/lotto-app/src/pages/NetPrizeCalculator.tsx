import { useEffect, useMemo, useState } from "react";
import { useLottoContext } from "@/context/LottoDataContext";
import { fetchRoundDetail, formatWon } from "@/utils/lottoDetail";
import {
  calculateNetPrize,
  formatWonInput,
  parseWonInput,
  type NetPrizeResult,
} from "@/utils/netPrize";

type LottoRank = 1 | 2;

const EMPTY_RESULT: NetPrizeResult = { gross: 0, tax: 0, net: 0 };

export default function NetPrizeCalculator() {
  const { allRounds } = useLottoContext();
  const [drwNo, setDrwNo] = useState<number | null>(null);
  const [lottoRank, setLottoRank] = useState<LottoRank>(1);
  const [grossInput, setGrossInput] = useState("");
  const [loadingPrize, setLoadingPrize] = useState(false);

  const rounds = useMemo(
    () => [...allRounds].sort((a, b) => b.drwNo - a.drwNo),
    [allRounds],
  );

  useEffect(() => {
    if (rounds.length === 0) return;
    setDrwNo((prev) => prev ?? rounds[0].drwNo);
  }, [rounds]);

  useEffect(() => {
    if (drwNo == null) return;
    let cancelled = false;
    setLoadingPrize(true);
    void fetchRoundDetail(drwNo).then((detail) => {
      if (cancelled) return;
      const prize = detail?.prizes?.find((p) => p.rank === lottoRank);
      if (prize?.amount) {
        setGrossInput(formatWonInput(prize.amount));
      }
      setLoadingPrize(false);
    });
    return () => {
      cancelled = true;
    };
  }, [drwNo, lottoRank]);

  const grossAmount = parseWonInput(grossInput);
  const result =
    grossAmount > 0 ? calculateNetPrize(grossAmount, "lotto") : EMPTY_RESULT;
  const hasAmount = grossAmount > 0;

  return (
    <div className="net-prize-page">
      <div className="net-prize-scroll">
        <section className="net-prize-panel" aria-label="실수령액 계산">
          <div className="net-prize-controls">
            <label className="net-prize-controls__field">
              <span className="net-prize-controls__label">회차</span>
              <select
                value={drwNo ?? ""}
                onChange={(e) => setDrwNo(Number(e.target.value))}
                className="net-prize-controls__select"
                disabled={rounds.length === 0}
              >
                {rounds.map((round) => (
                  <option key={round.drwNo} value={round.drwNo}>
                    제{round.drwNo}회
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="net-prize-controls__ranks">
              <legend className="sr-only">등수</legend>
              {([1, 2] as const).map((rank) => (
                <label
                  key={rank}
                  className={`net-prize-controls__rank${
                    lottoRank === rank ? " net-prize-controls__rank--active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="lotto-rank"
                    className="sr-only"
                    checked={lottoRank === rank}
                    onChange={() => setLottoRank(rank)}
                  />
                  <span>{rank}등</span>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="net-prize-hero">
            <p className="net-prize-hero__label">
              {drwNo ? `제 ${drwNo}회 ${lottoRank}등` : "1인당"} 당첨금
            </p>
            <div className="net-prize-hero__amount-wrap">
              <input
                type="text"
                inputMode="numeric"
                value={grossInput}
                onChange={(e) => {
                  setGrossInput(e.target.value.replace(/[^\d,]/g, ""));
                }}
                onBlur={() => {
                  const parsed = parseWonInput(grossInput);
                  setGrossInput(parsed > 0 ? formatWonInput(parsed) : "");
                }}
                placeholder="금액 입력"
                className="net-prize-hero__amount-input"
                readOnly={loadingPrize}
                aria-label="1인당 당첨금"
              />
              <span className="net-prize-hero__won">원</span>
            </div>
            {loadingPrize ? (
              <p className="net-prize-hero__meta">당첨금 불러오는 중…</p>
            ) : null}
          </div>

          <div className="net-prize-table" role="table" aria-label="세금 계산">
            <div className="net-prize-table__head" role="row">
              <span role="columnheader">항목</span>
              <span role="columnheader">금액</span>
            </div>
            <div className="net-prize-table__body">
              <div className="net-prize-table__row net-prize-table__row--gross" role="row">
                <span className="net-prize-table__label" role="cell">
                  <span className="net-prize-table__badge">당첨금</span>
                </span>
                <span className="net-prize-table__amount" role="cell">
                  {formatWon(hasAmount ? result.gross : 0)}
                </span>
              </div>
              <div className="net-prize-table__row net-prize-table__row--tax" role="row">
                <span className="net-prize-table__label" role="cell">
                  <span className="net-prize-table__badge net-prize-table__badge--tax">세금</span>
                </span>
                <span className="net-prize-table__amount" role="cell">
                  {formatWon(hasAmount ? result.tax : 0)}
                </span>
              </div>
            </div>
          </div>

          <footer className="net-prize-footer" aria-live="polite">
            <span className="net-prize-footer__label">예상 실수령액</span>
            <strong className="net-prize-footer__amount">
              {formatWon(hasAmount ? result.net : 0)}
            </strong>
          </footer>

          <aside className="net-prize-info" aria-label="원천징수 세율 안내">
            <p className="net-prize-info__title">원천징수 세율</p>
            <ul className="net-prize-info__list">
              <li>200만 원 이하: 비과세</li>
              <li>200만 원 초과 ~ 3억 원 이하: 22%</li>
              <li>3억 원 초과: 33%</li>
            </ul>
            <p className="net-prize-info__note">
              참고용 계산이며 실제 세금은 수령 시점에 따라 달라질 수 있습니다.
            </p>
          </aside>
        </section>
      </div>
    </div>
  );
}
