import type { FooterSection } from "@/data/defaults";
import { applyProductTitle } from "@/utils/productPlaceholder";

export type DescriptionInput = {
  productTitle: string;
  productImageUrl: string;
  brandBannerUrl: string;
  specifications: string;
  contents: string;
  english: string;
  spanish: string;
  portuguese: string;
  footerSections: FooterSection[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesToBr(text: string): string {
  return escapeHtml(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1]?.length))
    .join("<br>");
}

function specListItems(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<li style="list-style: none; padding-bottom: 5px;"><font face="Arial" size="4">${escapeHtml(line)}</font></li>`,
    )
    .join("\n");
}

function sectionHeading(title: string, size: "4" | "5" = "4"): string {
  return `<li style="font-family: Arial;"><p style="margin: 35px 0px 15px;"><b><font size="${size}">${escapeHtml(title)}</font></b></p></li>`;
}

function langBlock(text: string): string {
  if (!text.trim()) return "";
  return `<li style="list-style: none; padding-bottom: 12px;"><font face="Arial" size="3">${linesToBr(text)}</font></li>
<li style="list-style: none; padding-bottom: 5px; text-align: center;"><font face="Arial" size="3">-</font></li>`;
}

function policyMainHeader(title: string): string {
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tbody style="line-height: 18.2px; font-size: 14px;">
<tr>
<td style="color: rgb(255, 255, 255); padding-top: 7px; padding-bottom: 7px; padding-left: 7px; background: rgb(136, 136, 136);">
<strong><font size="4">${escapeHtml(title)}</font></strong>
</td>
</tr>
<tr><td height="14">&nbsp;</td></tr>
</tbody>
</table>`;
}

function policySection(section: FooterSection): string {
  if (!section.title.trim() && !section.body.trim()) return "";
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tbody style="line-height: 18.2px; font-size: 14px;">
<tr>
<td style="color: rgb(136, 136, 136); padding-top: 5px; padding-bottom: 2px; border-bottom: 2px solid rgb(136, 136, 136);">
<strong><font size="4">${escapeHtml(section.title)}</font></strong>
</td>
</tr>
<tr>
<td style="padding-top: 10px; padding-bottom: 14px;"><font size="3">${linesToBr(section.body)}</font></td>
</tr>
</tbody>
</table>`;
}

function renderFooter(sections: FooterSection[]): string {
  const visible = sections.filter((s) => s.title.trim() || s.body.trim());
  if (visible.length === 0) return "";

  const blocks = visible.map((s) => policySection(s)).join("\n");

  return `<div style="font-family: Arial; font-size: 14pt;">
<table width="900" align="center" border="0" cellspacing="0" cellpadding="0" style="margin-top: 100px;">
<tbody style="line-height: 19.5px;">
<tr>
<td style="padding: 10px; line-height: 22px; font-family: Tahoma, Geneva, sans-serif; border-bottom: 3px solid rgb(136, 136, 136);">&nbsp;</td>
</tr>
<tr>
<td>
<div style="font-family: Arial, Helvetica, sans-serif; line-height: 18.2px; text-align: start; font-size: 14px;">
${policyMainHeader("STORE POLICY")}
</div>
<div style="font-family: Arial, Helvetica, sans-serif; line-height: 18.2px; text-align: start; font-size: 14px;">
${blocks}
</div>
</td>
</tr>
</tbody>
</table>
</div>`;
}

export function renderEbayDescription(input: DescriptionInput): string {
  const title = input.productTitle.trim() || "Product Title";
  const titleEscaped = escapeHtml(title);

  const banner = input.brandBannerUrl.trim()
    ? `<font face="Arial" style="font-family: Arial; font-size: 14pt;"><span style="font-size: 14pt; width: 100%;"><img style="width: 100%;" src="${escapeHtml(input.brandBannerUrl.trim())}"></span></font>\n`
    : "";

  const productImage = input.productImageUrl.trim()
    ? `<font face="Arial" style="font-family: Arial; font-size: 14pt;"><span style="margin-right: auto; margin-left: auto; font-size: 14pt;"><img src="${escapeHtml(input.productImageUrl.trim())}" style="display: block; width: 500px; max-width: 100%; margin: 0 auto; padding: 30px 0 50px"></span></font>\n`
    : "";

  const specsHtml = input.specifications.trim()
    ? `${sectionHeading("Specification")}\n${specListItems(input.specifications)}`
    : "";

  const contentsHtml = input.contents.trim()
    ? `${sectionHeading("What's in the box?")}\n${specListItems(input.contents)}`
    : "";

  const middleList = [
    specsHtml,
    contentsHtml,
    langBlock(applyProductTitle(input.english, title)),
    langBlock(applyProductTitle(input.spanish, title)),
    langBlock(applyProductTitle(input.portuguese, title)),
  ]
    .filter(Boolean)
    .join("\n");

  const footer = renderFooter(input.footerSections);

  return `<div style="width: 900px; max-width: 100%; margin: 0px auto;">
${banner}<h2 style="font-family: Arial; font-size: 14pt; padding: 5px; text-align: center; background-color: rgb(170, 170, 170); color: rgb(255, 255, 255); font-weight: 500;">${titleEscaped}</h2>
${productImage}<h1 style="margin: 0px 0px 60px; text-align: center;"><font face="Arial"><span style="font-size: 37.3333px;">${titleEscaped}</span></font></h1><div class="maintext" style="padding-left: 30px;"><ul style="margin: 0px;">
${middleList}
</ul>
</div>
${footer}
</div>`;
}

export function renderPlainText(input: DescriptionInput): string {
  const title = input.productTitle.trim() || "Product Title";
  const parts: string[] = [title, ""];

  if (input.specifications.trim()) {
    parts.push("Specification", input.specifications.trim(), "");
  }
  if (input.contents.trim()) {
    parts.push("What's in the box?", input.contents.trim(), "");
  }
  for (const text of [input.english, input.spanish, input.portuguese]) {
    const resolved = applyProductTitle(text, title);
    if (resolved.trim()) parts.push(resolved.trim(), "", "-", "");
  }
  for (const section of input.footerSections) {
    if (section.title.trim() || section.body.trim()) {
      parts.push(section.title, section.body, "");
    }
  }
  return parts.join("\n");
}
