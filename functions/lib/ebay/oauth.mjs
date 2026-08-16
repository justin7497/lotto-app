import crypto from "node:crypto";
import {
  getEbayApiBase,
  getEbayAuthBase,
  EBAY_SCOPES,
} from "./config.mjs";
import {
  saveOAuthState,
  consumeOAuthState,
  getTokenRecord,
  saveTokenRecord,
} from "./tokenStore.mjs";

/** @param {{ clientId: string; clientSecret: string; redirectUri: string; env: "sandbox" | "production" }} cfg */
export async function buildAuthUrl(cfg) {
  const state = crypto.randomBytes(24).toString("hex");
  await saveOAuthState(state, { env: cfg.env });

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: EBAY_SCOPES.join(" "),
    state,
  });

  return `${getEbayAuthBase(cfg.env)}/oauth2/authorize?${params.toString()}`;
}

/** @param {{ clientId: string; clientSecret: string; redirectUri: string; env: "sandbox" | "production" }} cfg */
async function exchangeToken(cfg, bodyParams) {
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`${getEbayApiBase(cfg.env)}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(bodyParams).toString(),
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`eBay token response parse error: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.error_description || data.error || `Token HTTP ${res.status}`);
  }
  return data;
}

/** @param {{ clientId: string; clientSecret: string; redirectUri: string; env: "sandbox" | "production" }} cfg */
export async function handleOAuthCallback(cfg, code, state) {
  const stateData = await consumeOAuthState(state);
  if (!stateData) {
    throw new Error("Invalid or expired OAuth state");
  }

  const env = stateData.env === "production" ? "production" : cfg.env;
  const token = await exchangeToken({ ...cfg, env }, {
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
  });

  const expiresIn = Number(token.expires_in) || 7200;
  await saveTokenRecord({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshTokenExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    env,
  });

  return { env };
}

/** @param {{ clientId: string; clientSecret: string; env: "sandbox" | "production" }} cfg */
export async function getValidAccessToken(cfg) {
  const record = await getTokenRecord();
  if (!record?.refreshToken) return null;

  const env = record.env === "production" ? "production" : cfg.env;
  if (record.expiresAt && record.expiresAt > Date.now() + 60_000) {
    return { accessToken: record.accessToken, env };
  }

  const token = await exchangeToken({ ...cfg, env }, {
    grant_type: "refresh_token",
    refresh_token: record.refreshToken,
    scope: EBAY_SCOPES.join(" "),
  });

  const expiresIn = Number(token.expires_in) || 7200;
  await saveTokenRecord({
    accessToken: token.access_token,
    refreshToken: token.refresh_token || record.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    env,
  });

  return { accessToken: token.access_token, env };
}

export async function getConnectionStatus() {
  const record = await getTokenRecord();
  if (!record?.refreshToken) {
    return { connected: false };
  }
  return {
    connected: true,
    env: record.env ?? "sandbox",
    expiresAt: record.expiresAt ?? null,
    updatedAt: record.updatedAt?.toDate?.()?.toISOString?.() ?? null,
  };
}
