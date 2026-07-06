import { BookOpen, X } from "lucide-react";
import { MODE_INFO, SINGLE_MODES } from "@/data/generatorModes";

interface GeneratorGuideSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function GeneratorGuideSheet({ open, onClose }: GeneratorGuideSheetProps) {
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
        aria-label="추천 설명"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-6 h-6 text-amber-600 shrink-0" />
            <h3 className="font-bold text-lg text-gray-900">추천 설명</h3>
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
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">1. 추천이란?</h4>
            <p className="text-base text-gray-700 leading-relaxed">
              <span className="font-semibold text-gray-800">개요:</span> 역대 당첨 데이터와 통계 규칙을
              활용해 원하는 방식으로 로또 번호를 만들어 주는 기능입니다.{" "}
              <strong>개별 생성</strong>은 한 가지 방식으로, <strong>일괄 생성</strong>은 여러 방식을
              한꺼번에 쓸 수 있습니다.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">2. 8가지 생성 방식</h4>
            <p className="text-base text-gray-700 leading-relaxed mb-3">
              버튼을 누르면 해당 방식 설명이 화면에 표시됩니다.
            </p>
            <div className="space-y-2.5">
              {SINGLE_MODES.map((m) => {
                const info = MODE_INFO[m];
                const Icon = info.icon;
                return (
                  <div key={m} className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      {info.label}
                    </p>
                    <p className="text-base text-gray-700 leading-relaxed">{info.guide}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">3. 이용 방법 및 특징</h4>
            <ul className="text-base text-gray-700 leading-relaxed space-y-2">
              <li>
                <strong className="text-gray-800">개별 생성:</strong> 방식 1개를 고르고 1~10게임을
                만듭니다.
              </li>
              <li>
                <strong className="text-gray-800">일괄 생성:</strong> 7가지 방식별 게임 수를 정해 한
                번에 여러 세트를 만듭니다.
              </li>
              <li>
                <strong className="text-gray-800">고급 옵션:</strong> 제외수·AC값·구간·끝수·연번 필터로
                조건을 더 좁힐 수 있습니다.
              </li>
              <li>
                <strong className="text-gray-800">QR 코드 활용:</strong> 생성 후 「판매점 스캐너에 인식
                요청해 주세요」를 눌러 매장에서 바로 구매할 수 있습니다.
              </li>
              <li>
                <strong className="text-gray-800">저장 기능:</strong> 마음에 드는 조합은 「추출번호」에
                저장해 둘 수 있습니다.
              </li>
            </ul>
          </section>

          <p className="text-base text-amber-900 bg-amber-100/60 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
            ⚠️ <strong>주의사항:</strong> 통계·패턴 기반 추천이며 당첨을 보장하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
