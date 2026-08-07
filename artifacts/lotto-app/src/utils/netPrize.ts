export type NetPrizeTaxMode = "lotto" | "pension" | "flat22";

export interface NetPrizeResult {
  gross: number;
  tax: number;
  net: number;
}

/** 복권 당첨금 원천징수 (로또·스피또·직접입력) */
export function calculateLottoNetPrize(grossWon: number): NetPrizeResult {
  const gross = Math.max(0, Math.floor(grossWon));
  if (gross <= 0) return { gross: 0, tax: 0, net: 0 };
  if (gross <= 2_000_000) return { gross, tax: 0, net: gross };

  let tax: number;
  if (gross <= 300_000_000) {
    tax = Math.floor((gross - 2_000_000) * 0.22);
  } else {
    tax = Math.floor((300_000_000 - 2_000_000) * 0.22 + (gross - 300_000_000) * 0.33);
  }

  return { gross, tax, net: gross - tax };
}

/** 연금복권 720+ 1등 — 22% 원천징수 */
export function calculatePensionNetPrize(grossWon: number): NetPrizeResult {
  const gross = Math.max(0, Math.floor(grossWon));
  if (gross <= 0) return { gross: 0, tax: 0, net: 0 };
  const tax = Math.floor(gross * 0.22);
  return { gross, tax, net: gross - tax };
}

export function calculateNetPrize(grossWon: number, mode: NetPrizeTaxMode): NetPrizeResult {
  if (mode === "pension") return calculatePensionNetPrize(grossWon);
  return calculateLottoNetPrize(grossWon);
}

export function parseWonInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

export function formatWonInput(amount: number): string {
  if (amount <= 0) return "";
  return amount.toLocaleString("ko-KR");
}
