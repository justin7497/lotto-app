import PageCard from "@/components/PageCard";
import type { SajuProfile } from "@/utils/sajuLucky";

const PILLAR_LABELS = ["연주", "월주", "일주", "시주"] as const;

export default function SajuProfileCard({
  profile,
  periodLabel,
  gameCount,
}: {
  profile: SajuProfile;
  periodLabel: string;
  gameCount: number;
}) {
  const pillars = [
    [profile.pillars.year, profile.pillars.yearHanja],
    [profile.pillars.month, profile.pillars.monthHanja],
    [profile.pillars.day, profile.pillars.dayHanja],
    [profile.pillars.hour, profile.pillars.hourHanja],
  ] as const;

  return (
    <PageCard className="saju-profile-card">
      <h3 className="saju-profile-card__title">
        {periodLabel} · 사주팔자 · {gameCount}게임
      </h3>

      <div className="saju-profile-card__pillars" aria-label="사주팔자">
        {pillars.map(([ko, hanja], index) => (
          <div key={PILLAR_LABELS[index]} className="saju-profile-card__pillar">
            <span className="saju-profile-card__pillar-label">{PILLAR_LABELS[index]}</span>
            <span className="saju-profile-card__pillar-ko">{ko}</span>
            <span className="saju-profile-card__pillar-hanja">{hanja}</span>
          </div>
        ))}
      </div>

      <div className="saju-profile-card__meta">
        <span className="saju-profile-card__chip">
          <span className="saju-profile-card__chip-label">일간</span>
          {profile.dayMaster}
        </span>
        <span className="saju-profile-card__chip">
          {profile.zodiacEasternEmoji} {profile.zodiacEastern}
        </span>
        <span className="saju-profile-card__chip">
          {profile.zodiacWesternEmoji} {profile.zodiacWestern}
        </span>
        <span className="saju-profile-card__chip">{profile.bloodLabel}</span>
        {profile.voidBranches.length > 0 ? (
          <span className="saju-profile-card__chip">
            공망 {profile.voidBranches.join(", ")}
          </span>
        ) : null}
      </div>

      <p className="saju-profile-card__elements">{profile.elementSummary}</p>

      <details className="saju-profile-card__details">
        <summary className="saju-profile-card__details-summary">상세 정보</summary>
        <p className="saju-profile-card__details-note">{profile.engineNote}</p>
        <p className="saju-profile-card__details-line">
          입력 시간 <strong>{profile.hourPillarLabel}</strong>
        </p>
        <p className="saju-profile-card__details-line">
          행운 후보{" "}
          <strong className="saju-profile-card__lucky">{profile.luckyPool.join(", ")}</strong>
        </p>
      </details>
    </PageCard>
  );
}
