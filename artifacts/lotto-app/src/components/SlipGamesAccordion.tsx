import { ChevronDown, ChevronUp } from "lucide-react";
import SlipBallRow from "@/components/SlipBallRow";
import { slipGameCategoryLabel } from "@/utils/slipGameMeta";
import type { SlipGame } from "@/utils/slipDraft";

const PRICE_PER_GAME = 1000;
const SLOT_LABELS = ["A", "B", "C", "D", "E"] as const;

export default function SlipGamesAccordion({
  games,
  open,
  onToggle,
  createdAt,
  onPromoteToFixed,
}: {
  games: SlipGame[];
  open: boolean;
  onToggle: () => void;
  createdAt?: string | null;
  onPromoteToFixed?: (gameId: string) => void;
}) {
  const totalPrice = games.length * PRICE_PER_GAME;

  return (
    <section className="mobile-slip-games">
      {createdAt ? <p className="mobile-slip-games__created">생성일시 {createdAt}</p> : null}
      <button
        type="button"
        onClick={onToggle}
        className="mobile-slip-games__head"
        aria-expanded={open}
      >
        <span className="mobile-slip-games__summary">
          {games.length}게임 (총 {totalPrice.toLocaleString("ko-KR")}원)
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 shrink-0 text-gray-500" aria-hidden />
        ) : (
          <ChevronDown className="w-5 h-5 shrink-0 text-gray-500" aria-hidden />
        )}
      </button>

      {open ? (
        <ul className="mobile-slip-games__list">
          {games.map((game, index) => (
            <li key={game.id}>
              <div className="mobile-slip-games__row">
                <SlipBallRow
                  game={game}
                  slotLabel={SLOT_LABELS[index % SLOT_LABELS.length]}
                  tag={slipGameCategoryLabel(game)}
                />
                {onPromoteToFixed ? (
                  <button
                    type="button"
                    className="slip-promote-btn"
                    onClick={() => onPromoteToFixed(game.id)}
                  >
                    고정번호로 보관
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
