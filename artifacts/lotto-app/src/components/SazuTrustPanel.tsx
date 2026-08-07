import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

type SazuTrustState = "ready" | "loading" | "ok" | "error";

function resolveState(loading: boolean, status: string | null): SazuTrustState {
  if (loading) return "loading";
  if (!status) return "ready";
  if (/성공|수신 완료|응답 수신/.test(status)) return "ok";
  if (/실패|초과|오류/.test(status)) return "error";
  return "ready";
}

const STATE_COPY: Record<
  SazuTrustState,
  { badge: string; tone: "ready" | "loading" | "ok" | "error" }
> = {
  ready: {
    badge: "연동 활성",
    tone: "ready",
  },
  loading: {
    badge: "분석 확인 중",
    tone: "loading",
  },
  ok: {
    badge: "분석 완료",
    tone: "ok",
  },
  error: {
    badge: "엔진 응답 지연",
    tone: "error",
  },
};

export default function SazuTrustPanel({
  loading = false,
  status = null,
}: {
  loading?: boolean;
  status?: string | null;
}) {
  const state = resolveState(loading, status);
  const copy = STATE_COPY[state];

  return (
    <section className="sazu-trust-panel" aria-label="SAZU 사주 엔진 연동 안내">
      <div className="sazu-trust-panel__head">
        <span className="sazu-trust-panel__icon" aria-hidden>
          <ShieldCheck className="w-6 h-6" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="sazu-trust-panel__title">SAZU 만세력 엔진</p>
          <p className="sazu-trust-panel__subtitle">검증된 사주 분석 엔진과 공식 연동</p>
        </div>
        <span className={`sazu-trust-panel__badge sazu-trust-panel__badge--${copy.tone}`}>
          {state === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          ) : state === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          ) : state === "error" ? (
            <XCircle className="w-4 h-4 shrink-0" aria-hidden />
          ) : (
            <span className="sazu-trust-panel__dot" aria-hidden />
          )}
          {copy.badge}
        </span>
      </div>
    </section>
  );
}
