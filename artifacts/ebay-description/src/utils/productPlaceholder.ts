export const PRODUCT_PLACEHOLDER = "{{PRODUCT}}";

/** 템플릿의 {{PRODUCT}}를 현재 제품명으로 치환 */
export function applyProductTitle(text: string, productTitle: string): string {
  const name = productTitle.trim() || "Product Title";
  return text.split(PRODUCT_PLACEHOLDER).join(name);
}

const LEGACY_PRODUCT_NAMES = [
  "BTS Official Light Stick Ver.4",
  "official BTS Light Stick Ver.4",
  "Light Stick oficial de BTS Ver.4",
  "Light Stick oficial do BTS Ver.4",
  "BTS OFFICIAL LIGHT STICK MAP OF THE SOUL SPECIAL EDITION Ver.4",
];

/** 예전 저장본(하드코딩된 상품명)을 {{PRODUCT}} 템플릿으로 변환 */
export function migrateLangTemplate(text: string): string {
  if (text.includes(PRODUCT_PLACEHOLDER)) return text;
  let result = text;
  for (const legacy of LEGACY_PRODUCT_NAMES) {
    if (result.includes(legacy)) {
      result = result.replace(legacy, PRODUCT_PLACEHOLDER);
    }
  }
  return result;
}
