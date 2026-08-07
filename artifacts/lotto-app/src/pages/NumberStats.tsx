import NumberAnalysisPanel from "@/components/NumberAnalysisPanel";

export default function NumberStats() {
  return (
    <div className="page-content page-content--loose">
      <p className="text-center text-lg text-gray-600 leading-relaxed px-1">
        과거 당첨번호 패턴 · 출현 빈도 · 패턴분석표 · 홀짝·합계 분석
      </p>
      <NumberAnalysisPanel />
    </div>
  );
}
