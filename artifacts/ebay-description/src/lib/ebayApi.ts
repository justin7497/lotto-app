const API_BASE = "/api/ebay";

export type EbayConnectionStatus = {
  connected: boolean;
  configured?: boolean;
  env?: string;
  expiresAt?: number | null;
  updatedAt?: string | null;
};

export type EbayPolicyOption = {
  id: string;
  name: string;
  default?: boolean;
};

export type EbayLocationOption = {
  key: string;
  name: string;
};

export type EbaySetup = {
  fulfillmentPolicies: EbayPolicyOption[];
  paymentPolicies: EbayPolicyOption[];
  returnPolicies: EbayPolicyOption[];
  locations: EbayLocationOption[];
  defaults: {
    fulfillmentPolicy: EbayPolicyOption | null;
    paymentPolicy: EbayPolicyOption | null;
    returnPolicy: EbayPolicyOption | null;
    location: EbayLocationOption | null;
  };
};

export type PublishListingInput = {
  title: string;
  descriptionHtml: string;
  sku?: string;
  price: number;
  quantity?: number;
  categoryId?: string;
  brand?: string;
  imageUrls: string[];
  fulfillmentPolicyId?: string;
  paymentPolicyId?: string;
  returnPolicyId?: string;
  locationKey?: string;
};

export type PublishListingResult = {
  ok: boolean;
  offerId?: string;
  listingId?: string | null;
  sku?: string;
  listingUrl?: string | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchEbayStatus(): Promise<EbayConnectionStatus> {
  const res = await fetch(`${API_BASE}/status`);
  return parseJson(res);
}

export async function fetchEbayAuthUrl(): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/auth/url`);
  return parseJson(res);
}

export async function disconnectEbay(): Promise<void> {
  const res = await fetch(`${API_BASE}/disconnect`, { method: "POST" });
  await parseJson(res);
}

export async function fetchEbaySetup(): Promise<EbaySetup> {
  const res = await fetch(`${API_BASE}/setup`);
  return parseJson(res);
}

export async function publishEbayListing(
  input: PublishListingInput,
): Promise<PublishListingResult> {
  const res = await fetch(`${API_BASE}/listings/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}
