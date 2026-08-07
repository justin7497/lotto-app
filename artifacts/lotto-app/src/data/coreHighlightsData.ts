import type { HomeThemeAssets } from "./homeThemes";

export type CoreHighlightDetail = {
  title: string;
  desc: string;
  image: string;
};

export function buildCoreHighlightDetails(assets: HomeThemeAssets): CoreHighlightDetail[] {
  const p = assets.popup;
  return [
    {
      title: "티켓 QR 저장",
      desc: "오래 전에 산 복권·낡은 슬립지 용지도, QR만 스캔하면 번호가 나의 로또번호에 저장됩니다. 손으로 다시 적을 필요가 없습니다.",
      image: p.ticketQr,
    },
    {
      title: "QR 슬립지 발권",
      desc: "번호를 고르면 판매점 단말기용 QR이 만들어집니다. 종이에 동그라미 칠 필요 없이, QR만 보여 주면 티켓 출력까지 이어집니다.",
      image: p.slipQr,
    },
  ];
}
