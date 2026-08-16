import { DEFAULT_MARKETPLACE } from "./config.mjs";

/**
 * @param {ReturnType<import("./client.mjs").createEbayClient>} client
 * @param {{
 *   sku: string;
 *   title: string;
 *   descriptionHtml: string;
 *   price: number;
 *   currency?: string;
 *   quantity?: number;
 *   imageUrls: string[];
 *   categoryId?: string;
 *   brand?: string;
 *   policies: { fulfillmentPolicyId: string; paymentPolicyId: string; returnPolicyId: string };
 *   locationKey: string;
 * }} params
 */
export async function publishListing(client, params) {
  const {
    sku,
    title,
    descriptionHtml,
    price,
    currency = "USD",
    quantity = 1,
    imageUrls,
    categoryId,
    brand,
    policies,
    locationKey,
  } = params;

  const safeTitle = title.trim().slice(0, 80);
  const images = imageUrls.filter(Boolean).slice(0, 12);

  const product = {
    title: safeTitle,
    description: descriptionHtml,
    imageUrls: images.length ? images : undefined,
  };

  if (brand) {
    product.aspects = { Brand: [brand] };
  }

  await client.put(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    product,
    condition: "NEW",
    availability: {
      shipToLocationAvailability: { quantity },
    },
  });

  const existing = await client.get(
    `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${DEFAULT_MARKETPLACE}&limit=1`,
  );

  const offerBody = {
    sku,
    marketplaceId: DEFAULT_MARKETPLACE,
    format: "FIXED_PRICE",
    availableQuantity: quantity,
    categoryId: String(categoryId),
    listingDescription: descriptionHtml,
    merchantLocationKey: locationKey,
    pricingSummary: {
      price: { value: String(price), currency },
    },
    listingPolicies: {
      fulfillmentPolicyId: policies.fulfillmentPolicyId,
      paymentPolicyId: policies.paymentPolicyId,
      returnPolicyId: policies.returnPolicyId,
    },
  };

  let offerId;
  const existingOffer = existing?.offers?.[0];

  if (existingOffer?.offerId) {
    offerId = existingOffer.offerId;
    await client.put(`/sell/inventory/v1/offer/${offerId}`, {
      ...offerBody,
      offerId,
    });
  } else {
    const created = await client.post("/sell/inventory/v1/offer", offerBody);
    offerId = created.offerId;
  }

  const published = await client.post(`/sell/inventory/v1/offer/${offerId}/publish`, {});

  return {
    offerId,
    listingId: published.listingId ?? null,
    sku,
  };
}

/** @param {ReturnType<import("./client.mjs").createEbayClient>} client */
export async function fetchSellerSetup(client) {
  const [fulfillment, payment, returns, locations] = await Promise.all([
    client.get(`/sell/account/v1/fulfillment_policy?marketplace_id=${DEFAULT_MARKETPLACE}`),
    client.get(`/sell/account/v1/payment_policy?marketplace_id=${DEFAULT_MARKETPLACE}`),
    client.get(`/sell/account/v1/return_policy?marketplace_id=${DEFAULT_MARKETPLACE}`),
    client.get("/sell/inventory/v1/location?limit=20"),
  ]);

  const pickDefault = (items, idKey) => {
    const list = items ?? [];
    const def = list.find((item) => item.default) ?? list[0];
    return def ? { id: def[idKey], name: def.name ?? def[idKey] } : null;
  };

  return {
    fulfillmentPolicies: (fulfillment.fulfillmentPolicies ?? []).map((p) => ({
      id: p.fulfillmentPolicyId,
      name: p.name,
      default: Boolean(p.default),
    })),
    paymentPolicies: (payment.paymentPolicies ?? []).map((p) => ({
      id: p.paymentPolicyId,
      name: p.name,
      default: Boolean(p.default),
    })),
    returnPolicies: (returns.returnPolicies ?? []).map((p) => ({
      id: p.returnPolicyId,
      name: p.name,
      default: Boolean(p.default),
    })),
    locations: (locations.locations ?? []).map((loc) => ({
      key: loc.merchantLocationKey,
      name: loc.name ?? loc.merchantLocationKey,
    })),
    defaults: {
      fulfillmentPolicy: pickDefault(fulfillment.fulfillmentPolicies, "fulfillmentPolicyId"),
      paymentPolicy: pickDefault(payment.paymentPolicies, "paymentPolicyId"),
      returnPolicy: pickDefault(returns.returnPolicies, "returnPolicyId"),
      location: (() => {
        const list = locations.locations ?? [];
        const loc = list[0];
        return loc
          ? { key: loc.merchantLocationKey, name: loc.name ?? loc.merchantLocationKey }
          : null;
      })(),
    },
  };
}
