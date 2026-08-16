export type BagListingFields = {
  brandId: string;
  specifications: string;
  contents: string;
  english: string;
  spanish: string;
  portuguese: string;
};

const BRAND_ALIASES: { id: string; names: string[] }[] = [
  { id: "marc-jacobs", names: ["Marc Jacobs", "Marc by Marc Jacobs"] },
  { id: "montblanc", names: ["Montblanc"] },
  { id: "bts", names: ["BTS"] },
  { id: "blackpink", names: ["BLACKPINK"] },
  { id: "seventeen", names: ["SEVENTEEN"] },
  { id: "stray-kids", names: ["Stray Kids"] },
  { id: "newjeans", names: ["NewJeans"] },
];

const ENGLISH = `Hello,
The seller is Korean, and this item is {{PRODUCT}}, directly sourced in Korea.
You can also check the seller reviews before purchasing for additional confidence.
This is 100% authentic merchandise.
Thank you.`;

const SPANISH = `Hola,
El vendedor es coreano, y este producto es {{PRODUCT}}, adquirido directamente en Corea.
También puede revisar las reseñas del vendedor antes de comprar para mayor confianza.
Producto 100% auténtico.
Gracias.`;

const PORTUGUESE = `Olá,
O vendedor é coreano, e este produto é {{PRODUCT}}, adquirido diretamente na Coreia.
Você também pode verificar as avaliações do vendedor antes da compra para ter mais confiança.
Produto 100% autêntico.
Obrigado.`;

export function detectBrandId(title: string): string {
  const lower = title.toLowerCase();
  for (const brand of BRAND_ALIASES) {
    if (brand.names.some((name) => lower.includes(name.toLowerCase()))) {
      return brand.id;
    }
  }
  return "kstarforall";
}

/** 제목 끝의 모델 코드 (예: H652L01PF22) 추출 */
export function extractModelCode(title: string): string {
  const match = title.trim().match(/\b([A-Z0-9]{5,}[A-Z0-9]*)\s*$/i);
  return match?.[1]?.toUpperCase() ?? "";
}

export function generateBagListing(title: string): BagListingFields {
  const trimmed = title.trim();
  const model = extractModelCode(trimmed);
  const modelLine = model || trimmed;

  const specifications = `- MODEL : ${modelLine}
- MATERIAL : LEATHER
- SIZE : Please refer to the official size guide for this model
- COMPONENT : Brand dust bag (for storage) / Brand tag / Brand shopping bag (when available)
- PLACE OF ORIGIN : China/Vietnam/Cambodia/Philippines etc. (varies by season)
- CONDITION : Brand new / New with tags`;

  const contents = `- ${trimmed}`;

  return {
    brandId: detectBrandId(trimmed),
    specifications,
    contents,
    english: ENGLISH,
    spanish: SPANISH,
    portuguese: PORTUGUESE,
  };
}

export function isBagTitle(title: string): boolean {
  return title.trim().length > 0;
}
