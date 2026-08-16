import LottoBall from "@/components/LottoBall";

type DrawSceneBallProps = {
  number: number;
  /** mini: 추첨기·상자 / sm: 돌림판·플링코 / chest: 행운 상자 내부 */
  scene?: "mini" | "sm" | "chest";
};

/** 추첨 뽑기 게임 영역용 로또 공 (미리보기 일러스트와 동일한 gloss 공) */
export default function DrawSceneBall({ number, scene = "sm" }: DrawSceneBallProps) {
  return (
    <span className={`draw-scene-ball draw-scene-ball--${scene}`}>
      <LottoBall number={number} size="sm" variant="gloss" cssSized />
    </span>
  );
}
