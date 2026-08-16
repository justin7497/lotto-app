import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw, X } from "lucide-react";
import WinningStoreMap from "@/components/WinningStoreMap";
import LottoBall from "@/components/LottoBall";
import { useLottoContext } from "@/context/LottoDataContext";
import type { LottoRound, LottoRoundDetail, LottoWinStore } from "@/data/types";
import { isPhysicalLottoStore } from "@/utils/googleMap";
import { fetchRoundDetail, formatWon } from "@/utils/lottoDetail";
import { storeHasCoords, storeRowKey } from "@/utils/storeGeocode";
import {
  computeStoreWinStatsFromSyncRounds,
  computeStoreWinStatsUpTo,
  formatStoreWinStats,
  loadStoreWinStatsFile,
  lookupStoreWinStats,
  type RoundWinStore,
  type StoreWinStatEntry,
} from "@/utils/storeWinStats";

function storeMatchKey(store: Pick<LottoWinStore, "name" | "address">): string {
  return `${store.name}::${store.address}`;
}

type PageTab = "prizes" | "numbers" | "stores";

const INITIAL_HISTORY = 40;
const HISTORY_STEP = 40;

function formatDrawDateDot(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

function roundNumbers(round: LottoRound): number[] {
  return [
    round.drwtNo1,
    round.drwtNo2,
    round.drwtNo3,
    round.drwtNo4,
    round.drwtNo5,
    round.drwtNo6,
  ];
}

function pickTypeCounts(stores: LottoWinStore[]): { auto: number; manual: number } {
  let auto = 0;
  let manual = 0;
  for (const store of stores) {
    if (store.pickType.includes("자동")) auto += 1;
    else if (store.pickType.includes("수동")) manual += 1;
  }
  return { auto, manual };
}

function WinStoreMapFullscreen({
  open,
  onClose,
  drwNo,
  markerStores,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  drwNo: number;
  markerStores: LottoWinStore[];
  selected: LottoWinStore | null;
}) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="win-store-map-modal"
      role="dialog"
      aria-modal
      aria-labelledby="win-store-map-modal-title"
    >
      <header className="win-store-map-modal__header">
        <h2 id="win-store-map-modal-title" className="win-store-map-modal__title">
          제 {drwNo}회 1등 당첨판매점
        </h2>
        <button type="button" className="win-store-map-modal__close" onClick={onClose} aria-label="닫기">
          <X className="w-6 h-6" strokeWidth={2.25} aria-hidden />
        </button>
      </header>
      <div className="win-store-map-modal__body">
        <WinningStoreMap
          key={selected ? storeMatchKey(selected) : "all"}
          variant="fullscreen"
          markerStores={markerStores}
          selected={selected}
        />
      </div>
    </div>
  );
}

function RoundPicker({
  rounds,
  selectedDrwNo,
  onSelect,
  onClose,
}: {
  rounds: LottoRound[];
  selectedDrwNo: number;
  onSelect: (drwNo: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="win-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="win-picker"
        role="dialog"
        aria-modal
        aria-labelledby="win-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="win-picker__head">
          <h2 id="win-picker-title" className="win-picker__title">
            회차 선택
          </h2>
          <button type="button" className="win-picker__close" onClick={onClose} aria-label="닫기">
            <X className="w-6 h-6" />
          </button>
        </div>
        <label className="win-picker__label" htmlFor="win-round-select">
          회차
        </label>
        <select
          id="win-round-select"
          className="win-picker__select"
          value={selectedDrwNo}
          onChange={(e) => {
            onSelect(Number(e.target.value));
            onClose();
          }}
        >
          {rounds.map((round) => (
            <option key={round.drwNo} value={round.drwNo}>
              제{round.drwNo}회 · {formatDrawDateDot(round.drwNoDate)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PrizeTable({
  prizes,
  loading,
}: {
  prizes: LottoRoundDetail["prizes"];
  loading: boolean;
}) {
  if (loading && prizes.length === 0) {
    return <p className="win-prize-empty">당첨금 불러오는 중…</p>;
  }

  if (prizes.length === 0) {
    return <p className="win-prize-empty">당첨금 정보를 불러오지 못했습니다.</p>;
  }

  const tablePrizes = prizes.filter((prize) => prize.rank !== 1);

  return (
    <div className="win-prize-table" role="table" aria-label="2등 이하 당첨금">
      <div className="win-prize-table__head" role="row">
        <span role="columnheader">등수</span>
        <span role="columnheader">당첨자</span>
        <span role="columnheader">당첨금액</span>
      </div>
      <div className="win-prize-table__body">
        {tablePrizes.map((prize) => (
          <div
            key={prize.rank}
            className={`win-prize-table__row win-prize-table__row--rank-${prize.rank}`}
            role="row"
          >
            <span className="win-prize-table__rank" role="cell">
              <span className="win-prize-table__rank-badge">{prize.rank}등</span>
            </span>
            <span className="win-prize-table__winners" role="cell">
              {`${prize.winners.toLocaleString("ko-KR")}명`}
            </span>
            <span className="win-prize-table__amount" role="cell">
              {formatWon(prize.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreRows({
  stores,
  loading,
  rank,
  onRetry,
  winStatsEntries,
  selectedStore,
  onSelectStore,
}: {
  stores: LottoWinStore[];
  loading: boolean;
  rank: 1 | 2;
  onRetry: () => void;
  winStatsEntries: Record<string, StoreWinStatEntry>;
  selectedStore: LottoWinStore | null;
  onSelectStore: (store: LottoWinStore) => void;
}) {
  if (loading) {
    return <p className="win-empty">판매점 불러오는 중…</p>;
  }

  if (stores.length === 0) {
    return (
      <div className="win-empty-block">
        <p className="win-empty">
          {rank}등 판매점 정보가 아직 없습니다. 추첨 직후에는 잠시 후 다시 확인해 주세요.
        </p>
        <button type="button" onClick={onRetry} className="win-retry-btn">
          <RefreshCw className="w-5 h-5" />
          다시 불러오기
        </button>
      </div>
    );
  }

  return (
    <ol className="win-store-list">
      {stores.map((store, idx) => {
        const rowKey = storeRowKey(store, idx);
        const physical = isPhysicalLottoStore(store);
        const winStats = lookupStoreWinStats(store, winStatsEntries);
        const statsLabel = formatStoreWinStats(winStats);
        const selected = selectedStore ? storeMatchKey(selectedStore) === storeMatchKey(store) : false;
        const canSelect = physical && storeHasCoords(store);

        return (
          <li
            key={rowKey}
            className={`win-store-list__item${selected ? " win-store-list__item--selected" : ""}${canSelect ? " win-store-list__item--clickable" : ""}`}
          >
            <span className="win-store-list__idx" aria-hidden>
              {idx + 1}
            </span>
            <button
              type="button"
              className="win-store-list__body"
              disabled={!canSelect}
              onClick={() => onSelectStore(store)}
            >
              <div className="win-store-list__head">
                <div className="win-store-list__name-wrap">
                  <p className="win-store-list__name">
                    <span className="win-store-list__name-text">{store.name}</span>
                    {statsLabel ? (
                      <span className="win-store-list__stats"> ({statsLabel})</span>
                    ) : null}
                  </p>
                </div>
                <span className="win-store-list__type">{store.pickType}</span>
              </div>
              {store.address ? (
                <p className="win-store-list__addr" title={store.address}>
                  {store.address}
                </p>
              ) : null}
              {!physical ? <span className="win-store-list__online">온라인 구매</span> : null}
            </button>
            {canSelect ? (
              <button
                type="button"
                className={`win-store-list__pin${selected ? " win-store-list__pin--active" : ""}`}
                aria-label={`${store.name} 지도에서 보기`}
                onClick={() => onSelectStore(store)}
              >
                <MapPin className="w-4 h-4" strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function HistoryRow({
  round,
  selected,
  onSelect,
}: {
  round: LottoRound;
  selected: boolean;
  onSelect: (drwNo: number) => void;
}) {
  const numbers = roundNumbers(round);

  return (
    <li>
      <button
        type="button"
        className={`win-history-row${selected ? " win-history-row--selected" : ""}`}
        onClick={() => onSelect(round.drwNo)}
        aria-current={selected ? "true" : undefined}
      >
        <div className="win-history-row__meta">
          <span className="win-history-row__round">{round.drwNo}회</span>
          <span className="win-history-row__date">{formatDrawDateDot(round.drwNoDate)}</span>
        </div>
        <div className="win-history-row__balls">
          {numbers.map((n) => (
            <LottoBall key={n} number={n} size="md" />
          ))}
          <span className="win-history-row__plus" aria-hidden>
            +
          </span>
          <LottoBall number={round.bnusNo} size="md" isBonus />
        </div>
      </button>
    </li>
  );
}

export default function WinningNumbers() {
  const { allRounds, latestRound, status } = useLottoContext();
  const rounds = useMemo(() => [...allRounds].reverse(), [allRounds]);
  const latestDrwNo = latestRound?.drwNo ?? rounds[0]?.drwNo ?? null;

  const [tab, setTab] = useState<PageTab>("prizes");
  const [selectedDrwNo, setSelectedDrwNo] = useState<number | null>(latestDrwNo);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState<LottoRoundDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [historyCount, setHistoryCount] = useState(INITIAL_HISTORY);
  const [selectedStore, setSelectedStore] = useState<LottoWinStore | null>(null);
  const [mapFullscreenOpen, setMapFullscreenOpen] = useState(false);
  const [winStatsRoundWins, setWinStatsRoundWins] = useState<Record<string, RoundWinStore[]>>({});
  const [storesSyncRounds, setStoresSyncRounds] = useState<
    Record<string, { stores1?: LottoWinStore[]; stores2?: LottoWinStore[] }>
  >({});

  useEffect(() => {
    if (latestDrwNo !== null) {
      setSelectedDrwNo((prev) => prev ?? latestDrwNo);
    }
  }, [latestDrwNo]);

  const activeDrwNo = selectedDrwNo ?? latestDrwNo ?? rounds[0]?.drwNo ?? 0;
  const selectedIndex = rounds.findIndex((round) => round.drwNo === activeDrwNo);
  const selectedRound = rounds[selectedIndex] ?? rounds[0];
  const visibleHistory = useMemo(() => rounds.slice(0, historyCount), [rounds, historyCount]);
  const firstPrize = detail?.prizes?.find((p) => p.rank === 1);
  const firstPrizeTypeCounts = pickTypeCounts(detail?.stores1 ?? []);
  const winStatsEntries = useMemo(() => {
    if (Object.keys(winStatsRoundWins).length > 0) {
      return computeStoreWinStatsUpTo(winStatsRoundWins, activeDrwNo);
    }
    return computeStoreWinStatsFromSyncRounds(storesSyncRounds, activeDrwNo);
  }, [activeDrwNo, storesSyncRounds, winStatsRoundWins]);

  const handleSelectStore = useCallback((store: LottoWinStore) => {
    setSelectedStore(store);
  }, []);

  useEffect(() => {
    if (tab !== "stores") {
      setMapFullscreenOpen(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!activeDrwNo) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const fetched = await fetchRoundDetail(activeDrwNo);
      if (cancelled) return;
      setDetail(fetched);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeDrwNo, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    void loadStoreWinStatsFile().then((file) => {
      if (!cancelled && file?.roundWins) {
        setWinStatsRoundWins(file.roundWins);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/lotto-stores-sync.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.rounds) {
          setStoresSyncRounds(data.rounds);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedStore(null);
  }, [activeDrwNo]);

  function goPrev() {
    if (selectedIndex < rounds.length - 1) {
      setSelectedDrwNo(rounds[selectedIndex + 1].drwNo);
    }
  }

  function goNext() {
    if (selectedIndex > 0) {
      setSelectedDrwNo(rounds[selectedIndex - 1].drwNo);
    }
  }

  if (status === "loading" && rounds.length === 0) {
    return (
      <div className="winning-numbers-page">
        <p className="win-empty win-empty--page">불러오는 중…</p>
      </div>
    );
  }

  const pageLayoutClass =
    tab === "stores"
      ? " winning-numbers-page--stores"
      : tab === "prizes"
        ? " winning-numbers-page--prizes"
        : tab === "numbers"
          ? " winning-numbers-page--numbers"
          : "";

  return (
    <div className={`winning-numbers-page${pageLayoutClass}`}>
      <div className="win-page-tabs" role="tablist" aria-label="당첨 정보">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "prizes"}
          className={`win-page-tabs__btn${tab === "prizes" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("prizes")}
        >
          당첨금
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "numbers"}
          className={`win-page-tabs__btn${tab === "numbers" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("numbers")}
        >
          당첨번호
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stores"}
          className={`win-page-tabs__btn${tab === "stores" ? " win-page-tabs__btn--active" : ""}`}
          onClick={() => setTab("stores")}
        >
          당첨판매점
        </button>
      </div>

      {tab !== "numbers" ? (
        <div className="win-round-nav" aria-label="회차 이동">
          <button
            type="button"
            className="win-round-nav__arrow"
            onClick={goPrev}
            disabled={selectedIndex >= rounds.length - 1}
            aria-label="이전 회차"
          >
            <ChevronLeft className="win-round-nav__arrow-icon" strokeWidth={2.5} aria-hidden />
          </button>

          <button
            type="button"
            className="win-round-nav__pick"
            onClick={() => setPickerOpen(true)}
            aria-label={`제${activeDrwNo}회 선택, 회차 변경`}
          >
            <span className="win-round-nav__label">제 {activeDrwNo}회</span>
            <span className="win-round-nav__date">
              {selectedRound ? formatDrawDateDot(selectedRound.drwNoDate) : ""}
            </span>
            <span className="win-round-nav__hint">탭하여 회차 선택</span>
          </button>

          <button
            type="button"
            className="win-round-nav__arrow"
            onClick={goNext}
            disabled={selectedIndex <= 0}
            aria-label="다음 회차"
          >
            <ChevronRight className="win-round-nav__arrow-icon" strokeWidth={2.5} aria-hidden />
          </button>

          <button
            type="button"
            className="win-round-nav__refresh"
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label="새로고침"
          >
            <RefreshCw className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>
      ) : null}

      {tab === "prizes" ? (
        <div className="win-prizes-scroll">
          <section className="win-prize-panel" aria-label="등수별 당첨금">
            {firstPrize ? (
              <div className="win-prize-hero">
                <p className="win-prize-hero__label">제 {activeDrwNo}회 1등 당첨금</p>
                <p className="win-prize-hero__amount">{formatWon(firstPrize.amount)}</p>
                {firstPrizeTypeCounts.auto > 0 || firstPrizeTypeCounts.manual > 0 ? (
                  <p className="win-prize-hero__meta">
                    당첨 {firstPrize.winners.toLocaleString("ko-KR")}명 · 자동 {firstPrizeTypeCounts.auto} · 수동{" "}
                    {firstPrizeTypeCounts.manual}
                  </p>
                ) : (
                  <p className="win-prize-hero__meta">
                    당첨 {firstPrize.winners.toLocaleString("ko-KR")}명
                  </p>
                )}
              </div>
            ) : loading ? (
              <div className="win-prize-hero win-prize-hero--loading">
                <p className="win-prize-hero__label">당첨금 불러오는 중…</p>
              </div>
            ) : null}

            <PrizeTable prizes={detail?.prizes ?? []} loading={loading} />

            {detail?.totalSales ? (
              <footer className="win-prize-footer">
                <span className="win-prize-footer__label">총 판매액</span>
                <strong className="win-prize-footer__amount">{formatWon(detail.totalSales)}</strong>
              </footer>
            ) : null}
          </section>
        </div>
      ) : tab === "numbers" ? (
        <div className="win-numbers-scroll">
          <section className="win-card win-card--history" aria-label="당첨번호 목록">
            <ul className="win-history-list">
              {visibleHistory.map((round) => (
                <HistoryRow
                  key={round.drwNo}
                  round={round}
                  selected={round.drwNo === activeDrwNo}
                  onSelect={setSelectedDrwNo}
                />
              ))}
            </ul>
            {historyCount < rounds.length ? (
              <button
                type="button"
                className="win-more-btn"
                onClick={() => setHistoryCount((n) => n + HISTORY_STEP)}
              >
                이전 회차 더 보기 ({rounds.length - historyCount}회 남음)
              </button>
            ) : null}
          </section>
        </div>
      ) : (
        <>
          <section className="win-store-map-card win-store-map-card--pinned" aria-label="1등 당첨판매점 지도">
            <div
              role="button"
              tabIndex={0}
              className="win-store-map-card__open"
              onClick={() => setMapFullscreenOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setMapFullscreenOpen(true);
                }
              }}
              aria-label="지도 전체화면으로 보기"
            >
              <WinningStoreMap
                variant="preview"
                markerStores={detail?.stores1 ?? []}
                selected={selectedStore}
              />
            </div>
          </section>

          <WinStoreMapFullscreen
            open={mapFullscreenOpen}
            onClose={() => setMapFullscreenOpen(false)}
            drwNo={activeDrwNo}
            markerStores={detail?.stores1 ?? []}
            selected={selectedStore}
          />

          <div className="win-stores-scroll">
            <section className="win-card" aria-labelledby="win-store1-title">
              <h2 id="win-store1-title" className="win-card__title">
                1등 당첨판매점
                {firstPrize ? (
                  <span className="win-card__title-sub">{formatWon(firstPrize.amount)}</span>
                ) : null}
              </h2>
              <StoreRows
                stores={detail?.stores1 ?? []}
                loading={loading}
                rank={1}
                onRetry={() => setReloadKey((k) => k + 1)}
                winStatsEntries={winStatsEntries}
                selectedStore={selectedStore}
                onSelectStore={handleSelectStore}
              />
            </section>

            <section className="win-card" aria-labelledby="win-store2-title">
              <h2 id="win-store2-title" className="win-card__title">
                2등 당첨판매점
              </h2>
              <StoreRows
                stores={detail?.stores2 ?? []}
                loading={loading}
                rank={2}
                onRetry={() => setReloadKey((k) => k + 1)}
                winStatsEntries={winStatsEntries}
                selectedStore={selectedStore}
                onSelectStore={handleSelectStore}
              />
            </section>
          </div>
        </>
      )}

      {pickerOpen ? (
        <RoundPicker
          rounds={rounds}
          selectedDrwNo={activeDrwNo}
          onSelect={setSelectedDrwNo}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
