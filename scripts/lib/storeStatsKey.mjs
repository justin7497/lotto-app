/**
 * 판매점 주소 표기 차이(지번/도로명/괄호 등)를 통합하는 통계 키
 */
export function normalizeStoreAddress(address) {
  return String(address ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprintStoreAddress(address) {
  let compact = normalizeStoreAddress(address)
    .replace(/\([^)]*\)/g, " ")
    .replace(/번지/g, "")
    .replace(/\s+/g, "");

  const metroMatch = compact.match(
    /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/,
  );
  const metro = metroMatch?.[1] ?? "";

  const districtMatch = compact.match(
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)([가-힣]+(?:구|시|군))/,
  );
  const district = districtMatch?.[1] ?? "";

  const shopPatterns = [
    /주공\d+단지종합상가\d+/,
    /[가-힣]{1,12}상가\d+/,
    /[가-힣]+(?:로|길)\d+/,
  ];

  for (const pattern of shopPatterns) {
    const match = compact.match(pattern);
    if (match) {
      const token = match[0].replace(/호$/u, "").toLowerCase();
      return `${metro}|${district}|${token}`;
    }
  }

  const lotMatch = compact.match(/([가-힣]+동)(\d+(?:-\d+)?)/);
  if (lotMatch) {
    return `${metro}|${district}|${lotMatch[1]}${lotMatch[2]}`;
  }

  return `raw:${compact.toLowerCase()}`;
}

export function storeStatsKey(store) {
  return fingerprintStoreAddress(store.address);
}

/** @deprecated Use storeStatsKey */
export function geocodeCacheKey(address) {
  return normalizeStoreAddress(address);
}
