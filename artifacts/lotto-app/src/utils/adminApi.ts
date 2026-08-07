import { auth } from "@/lib/firebase";
import { ensureAuthTokenReady } from "@/utils/authReady";
import type { WishCategory } from "@/data/wishPhrases";

import type { EngagementCampaign, EngagementSettings } from "@/data/engagementCampaigns";

const API_BASE = "/api/admin";

export type AdminStats = {
  generatedAt: string;
  devices: {
    total: number;
    pushReady: number;
    noToken: number;
    optOut: number;
    linked: number;
  };
  users: {
    total: number;
    withPushTokens: number;
  };
  recentDevices: Array<{
    id: string;
    lastActiveAt: string | null;
    installedAt: string | null;
    hasFcmToken: boolean;
    engagementPushEnabled: boolean;
    pushReady: boolean;
    linkedUid: string | null;
    linkedEmail: string | null;
    platform: string | null;
    userAgent: string | null;
    lastEngagement: {
      campaignId: string;
      sentAt: string;
      success: boolean;
    } | null;
  }>;
};

export type WishPhrasesResponse = {
  source: "default" | "remote";
  categories: WishCategory[] | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const ready = await ensureAuthTokenReady();
  if (!ready || !auth?.currentUser) {
    throw new Error("로그인이 필요합니다.");
  }
  const token = await auth.currentUser.getIdToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `요청 실패 (${res.status})`);
  }
  return data as T;
}

export function fetchAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>("/stats");
}

export function fetchAdminWishPhrases(): Promise<WishPhrasesResponse> {
  return adminFetch<WishPhrasesResponse>("/wish-phrases");
}

export function saveAdminWishPhrases(categories: WishCategory[]): Promise<{ ok: boolean }> {
  return adminFetch<{ ok: boolean }>("/wish-phrases", {
    method: "PUT",
    body: JSON.stringify({ categories }),
  });
}

export function resetAdminWishPhrases(): Promise<{ ok: boolean }> {
  return adminFetch<{ ok: boolean }>("/wish-phrases/reset", { method: "POST" });
}

export type EngagementCampaignsResponse = {
  source: "default" | "remote";
  campaigns: EngagementCampaign[] | null;
  settings: EngagementSettings | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export function fetchAdminEngagementCampaigns(): Promise<EngagementCampaignsResponse> {
  return adminFetch<EngagementCampaignsResponse>("/engagement-campaigns");
}

export function saveAdminEngagementCampaigns(
  campaigns: EngagementCampaign[],
  settings: EngagementSettings,
): Promise<{ ok: boolean }> {
  return adminFetch<{ ok: boolean }>("/engagement-campaigns", {
    method: "PUT",
    body: JSON.stringify({ campaigns, settings }),
  });
}

export function resetAdminEngagementCampaigns(): Promise<{ ok: boolean }> {
  return adminFetch<{ ok: boolean }>("/engagement-campaigns/reset", { method: "POST" });
}

export type TestPushPayload = {
  channel: "self" | "device" | "engagement-all";
  title: string;
  body: string;
  link?: string;
  deviceId?: string;
  currentDeviceId?: string;
};

export type PushTargetsResponse = {
  tokenCount: number;
  targets: Array<{
    type: string;
    id: string;
    platform?: string | null;
    hasToken: boolean;
  }>;
};

export function fetchPushTargets(currentDeviceId: string): Promise<PushTargetsResponse> {
  const query = new URLSearchParams({ currentDeviceId });
  return adminFetch<PushTargetsResponse>(`/push/targets?${query.toString()}`);
}

export function syncAdminDevice(deviceId: string): Promise<{
  ok: boolean;
  hasToken?: boolean;
  platform?: string | null;
  message?: string;
}> {
  return adminFetch("/push/sync-device", {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
}

export type PushDeliveryResult = {
  platform: string | null;
  deviceId: string | null;
  source: string;
  ok: boolean;
  error?: string;
};

export function sendAdminTestPush(
  payload: TestPushPayload,
): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  tokens: number;
  androidCount?: number;
  pcCount?: number;
  deliveries?: PushDeliveryResult[];
  errors?: string[];
  message?: string;
}> {
  return adminFetch("/push/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
