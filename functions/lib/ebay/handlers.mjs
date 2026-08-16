import { initializeApp, getApps } from "firebase-admin/app";
import { buildAuthUrl, handleOAuthCallback, getValidAccessToken, getConnectionStatus } from "./oauth.mjs";
import { deleteTokenRecord } from "./tokenStore.mjs";
import { createEbayClient } from "./client.mjs";
import { publishListing, fetchSellerSetup } from "./publish.mjs";
import { DEFAULT_CATEGORY_ID } from "./config.mjs";

function ensureAdmin() {
  if (getApps().length === 0) initializeApp();
}

export function parseEbaySubPath(pathOnly) {
  const apiMatch = pathOnly.match(/\/api\/ebay\/(.*)$/);
  if (apiMatch) return apiMatch[1].replace(/\/$/, "");
  const fnMatch = pathOnly.match(/\/ebayApi\/(.*)$/);
  if (fnMatch) return fnMatch[1].replace(/\/$/, "");
  const trimmed = pathOnly.replace(/^\/+/, "");
  if (/^(auth|status|setup|listings)(\/|$)/.test(trimmed)) return trimmed.replace(/\/$/, "");
  return "";
}

export function parseEbayPath(req) {
  const pathOnly = String(req.path || req.url || "").split("?")[0];
  return parseEbaySubPath(pathOnly);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.rawBody === "string" && req.rawBody) {
    return JSON.parse(req.rawBody);
  }
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length) {
    return JSON.parse(req.rawBody.toString("utf8"));
  }
  return {};
}

function ebayConfigFromParams(params) {
  const clientId = params.clientId.value()?.trim();
  const clientSecret = params.clientSecret.value()?.trim();
  const redirectUri = params.redirectUri.value()?.trim();
  const envRaw = params.env.value()?.trim() || "sandbox";
  const env = envRaw === "production" ? "production" : "sandbox";
  const appOrigin = params.appOrigin.value()?.trim() || "https://kpopday-ebay.web.app";

  return { clientId, clientSecret, redirectUri, env, appOrigin };
}

function isConfigured(cfg) {
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.redirectUri);
}

/** @param {import("firebase-functions/v2/https").Request} req @param {import("firebase-functions/v2/https").Response} res @param {ReturnType<typeof ebayConfigFromParams>} cfg */
export async function handleEbayRequest(req, res, params) {
  ensureAdmin();
  const cfg = ebayConfigFromParams(params);
  const subPath = parseEbayPath(req);

  if (!isConfigured(cfg)) {
    if (subPath === "status" && req.method === "GET") {
      res.json({ connected: false, configured: false });
      return;
    }
    res.status(503).json({
      error: "eBay API not configured",
      message: "Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REDIRECT_URI in Firebase Functions params.",
    });
    return;
  }

  try {
    if (req.method === "GET" && subPath === "auth/url") {
      const url = await buildAuthUrl(cfg);
      res.json({ url });
      return;
    }

    if (req.method === "GET" && subPath === "auth/callback") {
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      if (!code || !state) {
        res.redirect(`${cfg.appOrigin}/?ebay=error&reason=missing_code`);
        return;
      }
      try {
        const result = await handleOAuthCallback(cfg, code, state);
        res.redirect(`${cfg.appOrigin}/?ebay=connected&env=${result.env}`);
      } catch (err) {
        const reason = encodeURIComponent(err instanceof Error ? err.message : String(err));
        res.redirect(`${cfg.appOrigin}/?ebay=error&reason=${reason}`);
      }
      return;
    }

    if (req.method === "GET" && subPath === "status") {
      const status = await getConnectionStatus();
      res.json({ ...status, configured: true });
      return;
    }

    if (req.method === "POST" && subPath === "disconnect") {
      await deleteTokenRecord();
      res.json({ ok: true });
      return;
    }

    const session = await getValidAccessToken(cfg);
    if (!session) {
      res.status(401).json({ error: "Not connected", message: "Connect eBay account first." });
      return;
    }

    const client = createEbayClient(session);

    if (req.method === "GET" && subPath === "setup") {
      const setup = await fetchSellerSetup(client);
      res.json(setup);
      return;
    }

    if (req.method === "POST" && subPath === "listings/publish") {
      const body = await readJsonBody(req);
      const title = String(body.title || "").trim();
      const descriptionHtml = String(body.descriptionHtml || "").trim();
      const sku = String(body.sku || "").trim() || `BAG-${Date.now()}`;
      const price = Number(body.price);
      const quantity = Math.max(1, Number(body.quantity) || 1);
      const categoryId = String(body.categoryId || DEFAULT_CATEGORY_ID);
      const brand = body.brand ? String(body.brand).trim() : undefined;

      const imageUrls = Array.isArray(body.imageUrls)
        ? body.imageUrls.map(String).filter(Boolean)
        : String(body.imageUrls || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);

      if (!title) {
        res.status(400).json({ error: "title is required" });
        return;
      }
      if (!descriptionHtml) {
        res.status(400).json({ error: "descriptionHtml is required" });
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        res.status(400).json({ error: "price must be a positive number" });
        return;
      }
      if (!imageUrls.length) {
        res.status(400).json({ error: "At least one public image URL is required" });
        return;
      }

      const setup = await fetchSellerSetup(client);
      const policies = {
        fulfillmentPolicyId:
          body.fulfillmentPolicyId || setup.defaults.fulfillmentPolicy?.id,
        paymentPolicyId: body.paymentPolicyId || setup.defaults.paymentPolicy?.id,
        returnPolicyId: body.returnPolicyId || setup.defaults.returnPolicy?.id,
      };
      const locationKey = body.locationKey || setup.defaults.location?.key;

      if (!policies.fulfillmentPolicyId || !policies.paymentPolicyId || !policies.returnPolicyId) {
        res.status(400).json({
          error: "Missing business policies",
          message: "Configure payment, fulfillment, and return policies in eBay Seller Hub.",
        });
        return;
      }
      if (!locationKey) {
        res.status(400).json({
          error: "Missing inventory location",
          message: "Add an inventory location in eBay Seller Hub.",
        });
        return;
      }

      const result = await publishListing(client, {
        sku,
        title,
        descriptionHtml,
        price,
        currency: body.currency || "USD",
        quantity,
        imageUrls,
        categoryId,
        brand,
        policies,
        locationKey,
      });

      res.json({
        ok: true,
        ...result,
        listingUrl: result.listingId
          ? `https://www.ebay.com/itm/${result.listingId}`
          : null,
      });
      return;
    }

    res.status(404).json({ error: "Not found", path: subPath });
  } catch (error) {
    res.status(error?.status && error.status >= 400 && error.status < 600 ? error.status : 502).json({
      error: "ebay_api_error",
      message: error instanceof Error ? error.message : String(error),
      details: error?.details ?? undefined,
    });
  }
}
