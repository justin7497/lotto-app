import { DEFAULT_FOOTER_SECTIONS, type FooterSection } from "@/data/defaults";

const FOOTER_STORAGE_KEY = "ebay-description-saved-footer";

function migrateStoreName(sections: FooterSection[]): FooterSection[] {
  return sections.map((s) => ({
    title: s.title
      .replaceAll("KPOPDAY", "KstarForAll")
      .replaceAll("STARFORALL", "KstarForAll"),
    body: s.body
      .replaceAll("KPOPDAY", "KstarForAll")
      .replaceAll("STARFORALL", "KstarForAll"),
  }));
}

export function loadSavedFooter(): FooterSection[] | null {
  try {
    const raw = localStorage.getItem(FOOTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FooterSection[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return migrateStoreName(parsed);
  } catch {
    return null;
  }
}

export function saveFooterPolicy(sections: FooterSection[]): void {
  localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(sections));
  localStorage.setItem(
    `${FOOTER_STORAGE_KEY}-updated-at`,
    new Date().toISOString(),
  );
}

export function getFooterSavedAt(): string | null {
  return localStorage.getItem(`${FOOTER_STORAGE_KEY}-updated-at`);
}

export function clearSavedFooter(): void {
  localStorage.removeItem(FOOTER_STORAGE_KEY);
  localStorage.removeItem(`${FOOTER_STORAGE_KEY}-updated-at`);
}

export function getInitialFooterSections(): FooterSection[] {
  return loadSavedFooter() ?? DEFAULT_FOOTER_SECTIONS;
}
