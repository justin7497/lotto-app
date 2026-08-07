const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export function normalizeStoreAddress(address) {
  return String(address ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function geocodeCacheKey(address) {
  return normalizeStoreAddress(address);
}

export function isPhysicalStoreAddress(name, address) {
  if (String(name).includes("인터넷")) return false;
  if (/dhlottery\.co\.kr/i.test(String(address))) return false;
  return normalizeStoreAddress(address).length >= 4;
}

export function readGoogleMapsApiKey(env = process.env) {
  return (
    env.GOOGLE_MAPS_GEOCODE_API_KEY?.trim() ||
    env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
    env.GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

export async function geocodeAddress(address, apiKey) {
  const normalized = normalizeStoreAddress(address);
  if (!normalized || !apiKey) return null;

  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", normalized);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "ko");
  url.searchParams.set("region", "kr");

  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return null;

  const json = await res.json();
  if (json.status !== "OK" || !json.results?.[0]?.geometry?.location) {
    return null;
  }

  const { lat, lng } = json.results[0].geometry.location;
  return {
    lat: Number(lat),
    lng: Number(lng),
    formattedAddress: json.results[0].formatted_address ?? normalized,
  };
}

export function collectUniqueAddresses(rounds) {
  const addresses = new Set();
  for (const round of Object.values(rounds ?? {})) {
    for (const store of [...(round.stores1 ?? []), ...(round.stores2 ?? [])]) {
      if (!isPhysicalStoreAddress(store.name, store.address)) continue;
      const key = geocodeCacheKey(store.address);
      if (key) addresses.add(key);
    }
  }
  return [...addresses];
}

export function attachCoordsToStore(store, cacheEntries) {
  if (!isPhysicalStoreAddress(store.name, store.address)) return store;
  const key = geocodeCacheKey(store.address);
  const cached = cacheEntries[key];
  if (!cached?.lat || !cached?.lng) return store;
  return { ...store, lat: cached.lat, lng: cached.lng };
}
