import type { ReactNode } from "react";

export default function PageCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const extra = className ? ` ${className}` : "";
  return <div className={`page-card${extra}`}>{children}</div>;
}
