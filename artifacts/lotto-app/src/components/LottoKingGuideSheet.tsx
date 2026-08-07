import { BookOpen, X } from "lucide-react";
import { useOverlayBack } from "@/hooks/useOverlayBack";

const GAME_COUNT = 5;
const KING_COUNT = 4;
const COVER_COUNT = 1;

interface LottoKingGuideSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function LottoKingGuideSheet({ open, onClose }: LottoKingGuideSheetProps) {
  const closeSheet = useOverlayBack(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={closeSheet}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="방식 설명"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-6 h-6 text-amber-600 shrink-0" />
            <h3 className="font-bold text-lg text-gray-900">방식 설명</h3>
          </div>
          <button
            type="button"
            onClick={closeSheet}
            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">1. 행운 · 패턴번호란?</h4>
            <p className="text-base text-gray-700 leading-relaxed">
              <span className="font-semibold text-gray-800">개요:</span>{" "}
              최근 20회차 당첨 데이터를 분석하여 한 번에 {GAME_COUNT}게임(5천 원 권)을 자동으로 추천하는 방식입니다.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">2. {GAME_COUNT}게임 조합 구성 방식</h4>
            <p className="text-base text-gray-700 leading-relaxed mb-3">
              추천되는 {GAME_COUNT}게임은 아래와 같이 2가지 패턴으로 나뉘어 조합됩니다.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-base font-bold text-amber-800 mb-2">
                  ① 패턴 {KING_COUNT}게임 (직전 회차 반영)
                </p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>직전 회차 당첨번호 중 1~2개를 반드시 포함합니다.</li>
                  <li>최근 회차에서 번호가 연속되거나 중복되어 나오는 경향(연번·이월수)을 반영합니다.</li>
                </ul>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-base font-bold text-emerald-800 mb-2">
                  ② 45번호 커버 {COVER_COUNT}게임 (전체 번호 분산)
                </p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>앞선 {KING_COUNT}게임에서 선택되지 않은 나머지 번호들을 활용합니다.</li>
                  <li>1~45번 전체 번호를 골고루 섞어, 특정 번호대에만 숫자가 몰리지 않도록 분산합니다.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">3. 이용 방법 및 특징</h4>
            <ul className="text-base text-gray-700 leading-relaxed space-y-2">
              <li>
                <strong className="text-gray-800">번호 생성:</strong> 「패턴 {GAME_COUNT}게임 생성하기」를 누르면 최근 패턴이 반영된 조합을 받을 수 있습니다.
              </li>
              <li>
                <strong className="text-gray-800">자동 저장:</strong> 생성된 번호는 금주 회차에 자동으로 저장됩니다.
              </li>
            </ul>
          </section>

          <p className="text-base text-amber-900 bg-amber-100/60 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
            ⚠️ <strong>주의사항:</strong> 본 서비스는 통계·패턴 기반의 추천 시스템일 뿐, 당첨을 보장하지는 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
