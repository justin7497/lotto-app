import type { SlipGame, SlipPickMode } from "@/utils/mobileSlip";
import { normalizeSlipPickForEncode } from "@/utils/slipEncodeRules";

/** 자동/반자동·수동 선택 → 단말기 QR 인코딩용 게임 데이터 */
export function resolveSlipPickForEncode(
  numbers: number[],
  options: { autoSemi: boolean },
): { numbers: number[]; mode: SlipPickMode } {
  const nums = [...numbers]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45)
    .sort((a, b) => a - b);

  if (new Set(nums).size !== nums.length) {
    throw new Error("번호가 중복되었습니다.");
  }

  if (options.autoSemi) {
    return normalizeSlipPickForEncode({ numbers: nums, mode: nums.length === 0 ? "A" : "M" });
  }

  return normalizeSlipPickForEncode({
    numbers: nums,
    mode: nums.length === 0 ? "A" : "M",
  });
}

/** QR 생성 직전 — mode A면 번호를 비우고, 수동·반자동은 정렬 */
export function normalizeSlipGameForEncode(game: SlipGame): SlipGame {
  const normalized = normalizeSlipPickForEncode(game);
  return { numbers: normalized.numbers, mode: normalized.mode };
}
