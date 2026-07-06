/** 동행복권 공식 구간 색 (1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록) */

export type LottoBallTier = "yellow" | "blue" | "red" | "gray" | "green";

export function getLottoBallTier(n: number): LottoBallTier {
  if (n <= 10) return "yellow";
  if (n <= 20) return "blue";
  if (n <= 30) return "red";
  if (n <= 40) return "gray";
  return "green";
}

export function getBallSolidColor(n: number): string {
  switch (getLottoBallTier(n)) {
    case "yellow":
      return "#E8A800";
    case "blue":
      return "#2563EB";
    case "red":
      return "#DC2626";
    case "gray":
      return "#4B5563";
    case "green":
      return "#16A34A";
  }
}

export function getBallGradientClasses(n: number): string {
  switch (getLottoBallTier(n)) {
    case "yellow":
      return "from-[#FFD54F] via-[#F9A825] to-[#E65100] ring-[#F57F17]/40";
    case "blue":
      return "from-[#60A5FA] via-[#2563EB] to-[#1D4ED8] ring-[#1E40AF]/40";
    case "red":
      return "from-[#F87171] via-[#DC2626] to-[#B91C1C] ring-[#991B1B]/40";
    case "gray":
      return "from-[#9CA3AF] via-[#4B5563] to-[#374151] ring-[#1F2937]/40";
    case "green":
      return "from-[#4ADE80] via-[#16A34A] to-[#15803D] ring-[#166534]/40";
  }
}
