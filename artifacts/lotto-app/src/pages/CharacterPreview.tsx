import { useState } from "react";
import IllustImage from "@/components/IllustImage";
import { CHARACTER_CANDIDATES, type CharacterCandidate } from "@/data/leadCharacter";

function CharacterDetail({ character }: { character: CharacterCandidate }) {
  return (
    <>
      <section className="char-preview__hero page-card">
        <div className="char-preview__hero-art">
          <IllustImage
            src={character.image}
            className="char-preview__hero-img"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="char-preview__hero-body">
          <p className="char-preview__role">{character.concept}</p>
          <h2 className="char-preview__name">
            {character.name}
            <span className="char-preview__name-en">{character.nameEn}</span>
          </h2>
          <p className="char-preview__tagline">{character.tagline}</p>
          <p className="char-preview__desc">{character.description}</p>
        </div>
      </section>

      <section className="page-card char-preview__section">
        <h3 className="char-preview__section-title">캐릭터 정보</h3>
        <dl className="char-preview__meta">
          <div>
            <dt>성격</dt>
            <dd>{character.personality.join(" · ")}</dd>
          </div>
          <div>
            <dt>타깃</dt>
            <dd>{character.targetAge}</dd>
          </div>
          <div>
            <dt>장점</dt>
            <dd>{character.pros}</dd>
          </div>
        </dl>
        <div className="char-preview__colors" aria-label="브랜드 컬러">
          {Object.entries(character.colors).map(([key, hex]) => (
            <span key={key} className="char-preview__swatch" style={{ backgroundColor: hex }} title={hex} />
          ))}
        </div>
      </section>

      <section className="page-card char-preview__section">
        <h3 className="char-preview__section-title">대사 샘플</h3>
        <ul className="char-preview__phrases">
          {character.phrases.map((phrase) => (
            <li key={phrase} className="char-preview__phrase">
              <span className="char-preview__bubble" aria-hidden>
                “
              </span>
              {phrase}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function CharacterPreview() {
  const [selectedId, setSelectedId] = useState(CHARACTER_CANDIDATES[0].id);
  const selected = CHARACTER_CANDIDATES.find((c) => c.id === selectedId) ?? CHARACTER_CANDIDATES[0];

  return (
    <div className="page-content char-preview">
      <p className="char-preview__badge">임시 미리보기 · 복돌이와 친구들</p>

      <header className="char-preview__intro page-card">
        <h1 className="char-preview__page-title">대표 캐릭터 후보</h1>
        <p className="char-preview__page-desc">
          로또 연령층을 고려한 6가지 아이디어입니다. 카드를 눌러 각 캐릭터를 비교해 보세요.
        </p>
      </header>

      <ul className="char-preview__picker" role="tablist" aria-label="캐릭터 후보">
        {CHARACTER_CANDIDATES.map((character) => {
          const active = character.id === selectedId;
          return (
            <li key={character.id} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className={`char-preview__pick${active ? " char-preview__pick--active" : ""}`}
                onClick={() => setSelectedId(character.id)}
              >
                <span className="char-preview__pick-art">
                  <IllustImage src={character.image} className="char-preview__pick-img" loading="lazy" />
                </span>
                <span className="char-preview__pick-name">{character.name}</span>
                <span className="char-preview__pick-concept">{character.concept}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div role="tabpanel" aria-label={selected.name}>
        <CharacterDetail character={selected} />
      </div>

      <p className="char-preview__note">
        이 페이지는 대표 캐릭터 검토용 임시 화면입니다. 확정 후 홈·메뉴에 적용할 수 있습니다.
      </p>
    </div>
  );
}
