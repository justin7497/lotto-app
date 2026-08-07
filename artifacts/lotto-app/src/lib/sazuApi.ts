import type { SajuInput } from "@/utils/sajuLucky";

interface SazuAnalyzeRequest {
  birth: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    timezone: string;
  };
  meta: {
    bloodType: SajuInput["bloodType"];
    locale: string;
    source: string;
  };
}

interface SazuAnalyzeResult {
  ok: boolean;
  message: string | null;
  raw: unknown;
}

const DEFAULT_TIMEOUT_MS = 8000;

function getTimeoutMs(): number {
  const raw = Number(import.meta.env.VITE_SAZU_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return raw;
}

export function isSazuConfigured(): boolean {
  const flag = String(import.meta.env.VITE_SAZU_ENABLED ?? "").toLowerCase();
  return flag !== "false";
}

function buildRequestBody(input: SajuInput): SazuAnalyzeRequest {
  return {
    birth: {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      timezone: "Asia/Seoul",
    },
    meta: {
      bloodType: input.bloodType,
      locale: "ko-KR",
      source: "lotto-app",
    },
  };
}

function stringifyTopLevelKeys(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const keys = Object.keys(data);
  if (keys.length === 0) return null;
  return `응답 키: ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? "..." : ""}`;
}

export async function fetchSazuAnalyze(input: SajuInput): Promise<SazuAnalyzeResult> {
  const endpoint =
    (import.meta.env.VITE_SAZU_ENDPOINT_URL as string | undefined) ?? "/api/sazu/analyze";
  if (!endpoint) {
    return { ok: false, message: "SAZU endpoint가 설정되지 않았습니다.", raw: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  try {
    const apiKey = import.meta.env.VITE_SAZU_API_KEY as string | undefined;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify(buildRequestBody(input)),
      signal: controller.signal,
    });

    const raw = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      const fallback = `SAZU 호출 실패 (${response.status})`;
      const message =
        raw &&
        typeof raw === "object" &&
        "message" in raw &&
        typeof (raw as { message?: unknown }).message === "string"
          ? (raw as { message: string }).message
          : fallback;
      return { ok: false, message, raw };
    }

    const message = stringifyTopLevelKeys(raw) ?? "SAZU 연동 응답 수신 완료";
    return { ok: true, message, raw };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, message: "SAZU 호출 시간 초과", raw: null };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "SAZU 호출 중 알 수 없는 오류",
      raw: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
