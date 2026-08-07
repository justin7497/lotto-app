import { BookOpen, X } from "lucide-react";
import { SAJU_DAILY_GAME_COUNT } from "@/utils/sajuLucky";
import { useOverlayBack } from "@/hooks/useOverlayBack";

interface SajuGuideSheetProps {
  open: boolean;
  onClose: () => void;
}

const GAME_COUNT = SAJU_DAILY_GAME_COUNT;

export default function SajuGuideSheet({ open, onClose }: SajuGuideSheetProps) {
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
        aria-label="사주 설명"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-6 h-6 text-violet-600 shrink-0" />
            <h3 className="font-bold text-lg text-gray-900">사주 설명</h3>
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
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">1. 사주 행운번호란?</h4>
            <p className="text-base text-gray-700 leading-relaxed">
              <span className="font-semibold text-gray-800">개요:</span>{" "}
              입력하신 생년월일·출생 시간(시진)·혈액형을 바탕으로 사주팔자를 계산하고,
              <strong>오늘 요일</strong>에 맞춰 <strong>{GAME_COUNT}게임(1만 원 권)</strong> 행운번호를 자동으로 추천하는 방식입니다.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">2. {GAME_COUNT}게임 조합 구성 방식</h4>
            <p className="text-base text-gray-700 leading-relaxed mb-3">
              추천 번호는 아래 3단계를 거쳐 조합됩니다.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                <p className="text-base font-bold text-violet-800 mb-2">① 사주팔자 계산 (만세력)</p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>manseryeok(KASI) 만세력으로 연·월·일·시주(사주팔자)를 앱 안에서 계산합니다.</li>
                  <li>일간(日干), 오행 분포, 띠·별자리 등을 함께 참고합니다.</li>
                </ul>
              </div>
              <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3">
                <p className="text-base font-bold text-purple-800 mb-2">② 행운 번호 풀 구성</p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>일간 오행, 강한 오행, 천간·지지(띠·시진), 별자리, 혈액형에서 행운 후보 번호를 모읍니다.</li>
                  <li>생성 결과 화면의 「행운 후보 번호」로 확인할 수 있습니다.</li>
                </ul>
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                <p className="text-base font-bold text-indigo-800 mb-2">③ {GAME_COUNT}게임 번호 조합</p>
                <ul className="text-base text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>행운 풀에서 2~4개를 우선 포함하고, 나머지는 가중 추출로 6개 번호를 채웁니다.</li>
                  <li>게임마다 서로 다른 조합이 되도록 중복을 피해 {GAME_COUNT}게임을 만듭니다.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-extrabold text-gray-900 mb-2">3. 이용 방법 및 특징</h4>
            <ul className="text-base text-gray-700 leading-relaxed space-y-2">
              <li>
                <strong className="text-gray-800">내 정보 입력:</strong> 생년월일·시진·혈액형을 입력하면 다시 열어도 그대로 불러옵니다.
              </li>
              <li>
                <strong className="text-gray-800">오늘 {GAME_COUNT}게임:</strong> 매일 「오늘 행운번호 {GAME_COUNT}게임 받기」로 번호를 받을 수 있으며, 오늘 받은 번호는 앱을 닫았다 열어도 유지됩니다. 날짜가 바뀌면 새로 받을 수 있습니다.
              </li>
              <li>
                <strong className="text-gray-800">QR 코드 활용:</strong> 번호 생성 후 「판매점 스캐너에 인식 요청해 주세요」를 눌러 QR을 보여 주면, 종이 슬립지에 펜으로 직접 마킹할 필요 없이 바로 구매할 수 있습니다.
              </li>
              <li>
                <strong className="text-gray-800">저장 기능:</strong> 마음에 드는 조합은 「추출번호」에 저장해 둘 수 있습니다.
              </li>
            </ul>
          </section>

          <p className="text-base text-violet-900 bg-violet-100/60 border border-violet-200 rounded-xl px-4 py-3 leading-relaxed">
            ⚠️ <strong>주의사항:</strong> 사주 계산은 manseryeok 만세력 기준이며, 번호 조합은 재미용 규칙입니다.
            정통 명리학 상담·점성술과 다를 수 있으며, 당첨을 보장하지는 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
