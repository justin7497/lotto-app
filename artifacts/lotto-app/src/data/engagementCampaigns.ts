export type CampaignSchedule =
  | "install-plus-1d"
  | "inactive-d3"
  | "inactive-d7"
  | "saturday-18kst"
  | "saturday-post-draw";

export type EngagementCampaign = {
  id: string;
  title: string;
  body: string;
  link: string;
  schedule: CampaignSchedule;
  priority: number;
  enabled?: boolean;
};

export type EngagementSettings = {
  maxPushesPerWeek: number;
};

export const DEFAULT_ENGAGEMENT_SETTINGS: EngagementSettings = {
  maxPushesPerWeek: 2,
};

export const CAMPAIGN_SCHEDULE_OPTIONS: Array<{ value: CampaignSchedule; label: string }> = [
  { value: "install-plus-1d", label: "설치 다음 날" },
  { value: "inactive-d3", label: "3일 미사용" },
  { value: "inactive-d7", label: "7일 미사용" },
  { value: "saturday-18kst", label: "토요일 18시 (추첨 전)" },
  { value: "saturday-post-draw", label: "토요일 추첨 후 (당첨 발표)" },
];

export const DEFAULT_ENGAGEMENT_CAMPAIGNS: EngagementCampaign[] = [
  {
    id: "welcome-d1",
    title: "소원로또에 오신 것을 환영해요",
    body: "번호 만들기·저장 방법을 확인해 보세요",
    link: "/generator",
    schedule: "install-plus-1d",
    priority: 10,
    enabled: true,
  },
  {
    id: "inactive-d3",
    title: "아직 번호 안 만드셨나요?",
    body: "추천 번호로 3초 만에 만들 수 있어요",
    link: "/generator",
    schedule: "inactive-d3",
    priority: 20,
    enabled: true,
  },
  {
    id: "sat-pre-draw",
    title: "오늘 밤 로또 추첨",
    body: "번호 준비하셨나요? 지금 만들어 보세요",
    link: "/generator",
    schedule: "saturday-18kst",
    priority: 30,
    enabled: true,
  },
  {
    id: "sat-post-draw",
    title: "당첨번호 발표",
    body: "이번 주 당첨번호를 확인해 보세요",
    link: "/winning-numbers",
    schedule: "saturday-post-draw",
    priority: 40,
    enabled: true,
  },
  {
    id: "inactive-d7",
    title: "다시 만나요",
    body: "저장한 번호·당첨 확인을 이어가 보세요",
    link: "/",
    schedule: "inactive-d7",
    priority: 50,
    enabled: true,
  },
];
