import { QrCode } from "lucide-react";

const STEPS = [
  { step: "1", text: "번호 만들기" },
  { step: "2", text: "판매점 스캐너에 인식 요청" },
  { step: "3", text: "매장에서 결제" },
];

export default function QrPromoBanner() {
  return (
    <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
          <QrCode className="w-7 h-7 text-white" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-lg sm:text-xl font-extrabold text-amber-950 leading-tight">
            종이 슬립 없이 · 판매점 스캐너로 구매
          </p>
          <p className="text-base text-amber-900/80 mt-1 leading-relaxed">
            번호를 만든 뒤 QR을 보여 주고, 판매점 스캐너에 인식 요청해 주세요.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map(({ step, text }) => (
          <div
            key={step}
            className="rounded-xl bg-white/80 border border-amber-100 px-2 py-3 text-center"
          >
            <p className="text-amber-600 font-extrabold text-lg leading-none mb-1">{step}</p>
            <p className="text-sm font-semibold text-gray-800 leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
