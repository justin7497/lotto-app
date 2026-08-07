/** 소원로또 대표 캐릭터 후보 6종 (임시 검토용) */

export type CharacterCandidate = {
  id: string;
  name: string;
  nameEn: string;
  concept: string;
  tagline: string;
  description: string;
  personality: string[];
  targetAge: string;
  pros: string;
  image: string;
  phrases: string[];
  colors: Record<string, string>;
};

export const CHARACTER_CANDIDATES: CharacterCandidate[] = [
  {
    id: "bokdori",
    name: "복돌이",
    nameEn: "Bokdori",
    concept: "복권집 아저씨형",
    tagline: "오늘도 한 장, 기분 좋게요!",
    description:
      "동네 복권 판매점을 오래 지켜온 따뜻한 상인. 번호를 강요하지 않고, 오늘의 기분과 소원을 함께 응원합니다.",
    personality: ["따뜻함", "신뢰", "응원", "여유"],
    targetAge: "40~60대 중심",
    pros: "현실감·신뢰감이 큼. 익숙한 인물형",
    image: "/illustrations/illust-bokdori-hero.png",
    phrases: [
      "오늘도 한 장, 기분 좋게요!",
      "번호는 가볍게, 마음은 따뜻하게.",
      "당첨 확인은 천천히, 꼼꼼하게.",
    ],
    colors: { primary: "#127a6e", vest: "#158f80", accent: "#fbc400", shirt: "#f8fafc" },
  },
  {
    id: "boksoon",
    name: "복순 할머니",
    nameEn: "Grandma Boksoon",
    concept: "행운 어르신형",
    tagline: "우리 손주도 오늘 좋은 날이야.",
    description:
      "복주머니를 든 인자한 할머니 행운 캐릭터. 보호·축복 이미지로 거부감이 적고, 로또의 소원·기대감과 잘 맞습니다.",
    personality: ["인자함", "축복", "포근함", "행운"],
    targetAge: "50~70대 강함",
    pros: "보호·축복 이미지, 소원·기대와 연결",
    image: "/illustrations/illust-char-boksoon.png",
    phrases: [
      "복주머니에 소원을 담아 보자.",
      "당첨이 아니어도, 오늘은 좋은 날이야.",
      "천천히 확인해, 서두르지 말고.",
    ],
    colors: { primary: "#127a6e", pouch: "#c62828", accent: "#fbc400", hanbok: "#e8f5f3" },
  },
  {
    id: "clover-grampa",
    name: "클로버 할배",
    nameEn: "Clover Grandpa",
    concept: "지혜·운세형",
    tagline: "욕심내지 말고, 오늘 한 장만.",
    description:
      "네잎클로버 지팡이를 든 지혜로운 할아버지. 사주·소원·패턴 추천 메뉴와 자연스럽게 연결되며, 꾸준함을 응원합니다.",
    personality: ["지혜", "여유", "응원", "꾸준함"],
    targetAge: "40~60대",
    pros: "사주·패턴·소원 메뉴와 시너지",
    image: "/illustrations/illust-char-clover-grampa.png",
    phrases: [
      "욕심내지 말고, 오늘 한 장만.",
      "패턴은 참고만, 마음이 먼저야.",
      "꾸준히, 기분 좋게 해보자.",
    ],
    colors: { primary: "#127a6e", coat: "#0f6b60", clover: "#4caf50", accent: "#fbc400" },
  },
  {
    id: "bokhak",
    name: "복학이",
    nameEn: "Bokhak",
    concept: "장수·복(福) 전통형",
    tagline: "복(福)이 찾아온 날이에요.",
    description:
      "두루미와 복(福) 모티브의 전통 행운 캐릭터. 연령과 관계없이 행운 상징이 바로 전달되며, 소원로또 브랜드 색과 조화를 이룹니다.",
    personality: ["행운", "장수", "전통", "상징"],
    targetAge: "50대 이상·전 연령",
    pros: "행운 상징이 직관적, 연령 편향 적음",
    image: "/illustrations/illust-char-bokhak.png",
    phrases: [
      "복(福)이 찾아온 날이에요.",
      "두루미처럼 좋은 소식 기다려 봐요.",
      "오늘의 행운, 함께 빌어요.",
    ],
    colors: { primary: "#127a6e", crane: "#e53935", accent: "#fbc400", fortune: "#c62828" },
  },
  {
    id: "haengi",
    name: "행이",
    nameEn: "Haengi",
    concept: "로또볼 요정형",
    tagline: "오늘의 행운, 같이 골라볼까요?",
    description:
      "로또볼에서 태어난 작은 요정. 사람 캐릭터보다 덜 유아틱하면서도 친근해, 전 연령에 부담 없는 중간 톤을 목표로 했습니다.",
    personality: ["발랄함", "행운", "친근함", "가벼움"],
    targetAge: "20~50대, 전 연령",
    pros: "남녀·연령 편향 적음, 브랜드 직관적",
    image: "/illustrations/illust-char-haengi.png",
    phrases: [
      "오늘의 행운, 같이 골라볼까요?",
      "번호는 재미로, 마음은 진심으로!",
      "저장해 두면 당첨 확인도 쉬워요.",
    ],
    colors: { primary: "#127a6e", ball: "#fbc400", wing: "#80cbc4", sparkle: "#fff59d" },
  },
  {
    id: "family",
    name: "복가족",
    nameEn: "Lotto Family",
    concept: "우리 집 로또형",
    tagline: "가족 소원, 함께 응원해요.",
    description:
      "로또를 함께 즐기는 부부 캐릭터. 명절·은퇴·가족 소원 등 실제 사용 맥락과 맞으며, 따뜻한 일상감을 전달합니다.",
    personality: ["가족", "일상", "소원", "함께"],
    targetAge: "40~60대 부부·가족",
    pros: "실제 사용 맥락(가족 소원)과 잘 맞음",
    image: "/illustrations/illust-char-family.png",
    phrases: [
      "가족 소원, 함께 응원해요.",
      "이번 주는 우리 번호로 도전!",
      "당첨되면 가족 외식이야.",
    ],
    colors: { primary: "#127a6e", husband: "#158f80", wife: "#fff8e1", accent: "#fbc400" },
  },
];

export function characterById(id: string): CharacterCandidate | undefined {
  return CHARACTER_CANDIDATES.find((c) => c.id === id);
}

/** @deprecated 단일 캐릭터 호환 — 첫 번째 후보 */
export const LEAD_CHARACTER = CHARACTER_CANDIDATES[0];
