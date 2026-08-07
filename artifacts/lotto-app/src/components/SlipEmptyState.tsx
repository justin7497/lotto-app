import { ChevronRight, Info } from "lucide-react";
import { SLIP_GAME_CATEGORY_LABELS, type SlipGameCategory } from "@/utils/slipGameMeta";

export default function SlipEmptyState({
  tab = "regular",
  onCreate,
}: {
  tab?: SlipGameCategory;
  onCreate: () => void;
}) {
  return (
    <div className="mobile-slip-empty">
      <div className="mobile-slip-empty__hero">
        <p className="mobile-slip-empty__message">저장된 슬립지가 없습니다.</p>
        <div className="mobile-slip-empty__load-links">
          <button
            type="button"
            onClick={onCreate}
            className="mobile-slip-empty__load-link"
          >
            <span className={`slip-game-category slip-game-category--${tab}`}>
              {SLIP_GAME_CATEGORY_LABELS[tab]}
            </span>
            <span>새로 만들기</span>
            <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
          </button>
        </div>
      </div>

      <section className="mobile-slip-empty__guide" aria-labelledby="mobile-slip-guide-title">
        <h2 id="mobile-slip-guide-title" className="mobile-slip-empty__guide-title">
          <Info className="w-5 h-5 shrink-0" aria-hidden />
          모바일 슬립지란?
        </h2>
        <p className="mobile-slip-empty__guide-lead">
          로또 6/45 번호를 종이 슬립지 대신 휴대폰에서 QR로 관리할 수 있는 기능이에요.
          일반번호와 고정번호는 탭으로 나뉘며, 각각 별도 QR로 판매점에 보여 줄 수 있어요.
        </p>
        <div className="mobile-slip-empty__steps">
          <p className="mobile-slip-empty__steps-label">이용 방법</p>
          <ol className="mobile-slip-empty__steps-list">
            <li>
              <span className="mobile-slip-empty__step-no">1</span>
              <span>
                <strong>새로 만들기</strong>로 슬립지에 번호를 직접 마킹해요.
              </span>
            </li>
            <li>
              <span className="mobile-slip-empty__step-no">2</span>
              <span>
                번호를 확인한 뒤 <strong>슬립지 QR코드 만들기</strong>를 눌러요.
              </span>
            </li>
            <li>
              <span className="mobile-slip-empty__step-no">3</span>
              <span>만든 QR 코드를 판매점에 보여 주세요.</span>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
