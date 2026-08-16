/** @typedef {"sandbox" | "production"} EbayEnv */

/** @param {EbayEnv} env */
export function getEbayApiBase(env) {
  return env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}

/** @param {EbayEnv} env */
export function getEbayAuthBase(env) {
  return env === "production" ? "https://auth.ebay.com" : "https://auth.sandbox.ebay.com";
}

export const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
];

export const DEFAULT_MARKETPLACE = "EBAY_US";
export const DEFAULT_CATEGORY_ID = "169291";
export const TOKEN_DOC_PATH = "ebayIntegration/default";
export const OAUTH_STATE_COLLECTION = "ebayOAuthState";
