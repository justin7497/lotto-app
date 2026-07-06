import { BookOpen, X } from "lucide-react";

interface LottoKingGuideSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function LottoKingGuideSheet({ open, onClose }: LottoKingGuideSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="로또킹 설명"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-6 h-6 text-amber-600 shrink-0" />
            <h3 className="font-bold text-lg text-gray-900">로또킹 설명</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">1. 로또킹이란?</h4>
            <p className="text-base text-gray-700 leading-relaxed">
              <span className="font-semibold text-gray-800">개요:</span>{" "}
              최근 20회차 당첨 데이터를 분석하여 한 번에 10게임(1만 원 권)을 자동으로 추천하는 방식입니다.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">2. 10게임 조합 구성 방식</h4>
            <p className="text-base text-gray-700 leading-relaxed mb-3">
              추천되는 10게임은 아래와 같이 2가지 패턴으로 나뉘어 조합됩니다.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-base font-bold text-amber-800 mb-2">① 패턴 6게임 (직전 회차 반영)</p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>직전 회차 당첨번호 중 1~2개를 반드시 포함합니다.</li>
                  <li>최근 회차에서 번호가 연속되거나 중복되어 나오는 경향(연번·이월수)을 반영합니다.</li>
                </ul>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-base font-bold text-emerald-800 mb-2">② 45번호 커버 4게임 (전체 번호 분산)</p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>앞선 6게임에서 선택되지 않은 나머지 번호들을 활용합니다.</li>
                  <li>1~45번 전체 번호를 골고루 섞어, 특정 번호대에만 숫자가 몰리지 않도록 분산 투자하는 게임입니다.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">3. 이용 방법 및 특징</h4>
            <ul className="text-base text-gray-700 leading-relaxed space-y-2">
              <li>
                <strong className="text-gray-800">QR 코드 활용:</strong> 번호 생성 후 「판매점 스캐너에 인식 요청해 주세요」를 눌러 QR을 보여 주면, 종이 슬립지에 펜으로 직접 마킹할 필요 없이 바로 구매할 수 있습니다.
              </li>
              <li>
                <strong className="text-gray-800">저장 기능:</strong> 마음에 드는 조합은 「추출번호」에 저장해 둘 수 있습니다.
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
