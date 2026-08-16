import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

export type TrustBadgeItem = {
  icon: LucideIcon;
  label: string;
};

export function TrustBadges({ items }: { items: TrustBadgeItem[] }) {
  return (
    <div className="trust-badges">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="trust-badges__item">
          <Icon className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

export function TrustHeader({ badges, lead }: { badges?: TrustBadgeItem[]; lead: string }) {
  return (
    <div className="trust-header">
      {badges && badges.length > 0 ? <TrustBadges items={badges} /> : null}
      <p className="trust-lead">{lead}</p>
    </div>
  );
}

export function TrustFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`trust-footer${className ? ` ${className}` : ""}`}>
      <Lock className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden />
      {children}
    </p>
  );
}

export function TrustPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`trust-panel${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function TrustShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`trust-shell${className ? ` ${className}` : ""}`}>{children}</div>;
}

export type TrustStep = { step: string; text: string; icon: LucideIcon };

export function TrustStepGuide({
  steps,
  lead,
  trust,
  compact = false,
  layout = "grid",
}: {
  steps: TrustStep[];
  lead?: string;
  trust?: string;
  compact?: boolean;
  layout?: "grid" | "list";
}) {
  const layoutClass =
    layout === "list" ? " trust-step-guide--list" : "";

  return (
    <section
      className={`trust-step-guide${compact ? " trust-step-guide--compact" : ""}${layoutClass}`}
      aria-label="이용 안내"
    >
      {lead ? <p className="trust-step-guide__lead">{lead}</p> : null}
      {layout === "list" ? (
        <ol className="trust-step-guide__list">
          {steps.map(({ step, text, icon: Icon }) => (
            <li key={step} className="trust-step-guide__list-item">
              <span className="trust-step-guide__list-num" aria-hidden>
                {step}
              </span>
              <span className="trust-step-guide__list-icon" aria-hidden>
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </span>
              <span className="trust-step-guide__list-text">{text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div
          className="trust-step-guide__steps"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map(({ step, text, icon: Icon }) => (
            <div key={step} className="trust-step-guide__step">
              <span className="trust-step-guide__step-icon" aria-hidden>
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </span>
              <span className="trust-step-guide__step-num">{step}</span>
              <span className="trust-step-guide__step-text">{text}</span>
            </div>
          ))}
        </div>
      )}
      {trust ? <TrustFooter>{trust}</TrustFooter> : null}
    </section>
  );
}

export function TrustScannerFrame() {
  return (
    <div className="trust-scanner-frame" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function TrustScannerCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="trust-scanner-card">
      <p className="trust-scanner-card__label">{label}</p>
      {children}
    </div>
  );
}

export function TrustStrip({
  badges,
  trust,
  className = "",
}: {
  badges: TrustBadgeItem[];
  trust?: string;
  className?: string;
}) {
  return (
    <div className={`trust-strip${className ? ` ${className}` : ""}`}>
      <TrustBadges items={badges} />
      {trust ? <TrustFooter>{trust}</TrustFooter> : null}
    </div>
  );
}
