import type { ReactNode } from "react";

export default function SubPageMain({ children }: { children: ReactNode }) {
  return (
    <main className="app-main app-main--sub">
      <div className="page-shell">{children}</div>
    </main>
  );
}
