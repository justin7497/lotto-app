export interface LottoRound {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
}

export interface LottoPrizeRank {
  rank: number;
  winners: number;
  amount: number;
  totalAmount?: number;
}

export interface LottoWinStore {
  name: string;
  pickType: string;
  address: string;
}

export interface LottoRoundDetail {
  drwNo: number;
  drwNoDate: string;
  prizes: LottoPrizeRank[];
  totalSales?: number;
  stores1: LottoWinStore[];
  stores2: LottoWinStore[];
}

export type LottoNumbers = [number, number, number, number, number, number];

export interface GeneratedNumbers {
  numbers: LottoNumbers;
  bonus?: number;
  mode: GeneratorMode;
  acValue?: number;
  score?: number;
  summary?: string;
  lottokingDetail?: {
    overlap: number;
    repeatFromLast: number[];
    repeatFromPrev2?: number[];
    consecutiveRanges: string[];
    consecutivePairCount: number;
    maxRun: number;
    profileLabel?: string;
    consecZoneLabel?: string;
  };
}

export type GeneratorMode =
  | "balanced"
  | "weighted"
  | "random"
  | "monte"
  | "delta"
  | "sector"
  | "tail"
  | "consecutive"
  | "lottoking"
  | "saju";

export interface FrequencyData {
  number: number;
  count: number;
  percentage: number;
}

export interface SumDistribution {
  range: string;
  count: number;
  isHighlight?: boolean;
}

export interface OddEvenData {
  label: string;
  count: number;
  percentage: number;
}

export interface RecentTrend {
  number: number;
  lastSeen: number;
  appearsInLast10: boolean;
  countInLast10: number;
}
