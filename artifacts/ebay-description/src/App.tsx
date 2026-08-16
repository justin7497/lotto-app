import { useCallback, useEffect, useMemo, useState } from "react";
import BannerPicker from "@/components/BannerPicker";
import EbayPublishPanel from "@/components/EbayPublishPanel";
import ImageResizeTool from "@/components/ImageResizeTool";
import {
  DEFAULT_FOOTER_SECTIONS,
  DEFAULT_PRODUCT_IMAGE,
  DEFAULT_PRODUCT_TITLE,
  type FooterSection,
} from "@/data/defaults";
import { getBrandImageUrl } from "@/data/brands";
import {
  clearSavedFooter,
  getFooterSavedAt,
  getInitialFooterSections,
  saveFooterPolicy,
} from "@/storage/footerPolicy";
import { generateBagListing } from "@/utils/bagListingGenerator";
import {
  renderEbayDescription,
  renderPlainText,
  type DescriptionInput,
} from "@/utils/renderDescription";

const DRAFT_KEY = "ebay-description-draft-v4";

type Draft = {
  brandId: string;
  brandBannerUrl: string;
  productTitle: string;
  productImageUrl: string;
  autoFill: boolean;
  specifications: string;
  contents: string;
  english: string;
  spanish: string;
  portuguese: string;
};

function loadDraft(): Partial<Draft> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Draft>;
  } catch {
    return {};
  }
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

function applyGeneratedFields(
  title: string,
  setters: {
    setSpecifications: (v: string) => void;
    setContents: (v: string) => void;
    setEnglish: (v: string) => void;
    setSpanish: (v: string) => void;
    setPortuguese: (v: string) => void;
    setBrandId: (v: string) => void;
    setBrandBannerUrl: (v: string) => void;
  },
) {
  const generated = generateBagListing(title);
  setters.setSpecifications(generated.specifications);
  setters.setContents(generated.contents);
  setters.setEnglish(generated.english);
  setters.setSpanish(generated.spanish);
  setters.setPortuguese(generated.portuguese);
  setters.setBrandId(generated.brandId);
  const banner = getBrandImageUrl(generated.brandId);
  if (banner) setters.setBrandBannerUrl(banner);
}

export default function App() {
  const saved = loadDraft();
  const legacyBrandIds = new Set(["kpopday", "starforall"]);
  const initialBrandId = legacyBrandIds.has(saved.brandId ?? "")
    ? "kstarforall"
    : (saved.brandId ?? "kstarforall");

  const initialTitle = saved.productTitle ?? DEFAULT_PRODUCT_TITLE;
  const initialGenerated = generateBagListing(initialTitle);

  const [brandId, setBrandId] = useState(saved.brandId ?? initialGenerated.brandId);
  const [brandBannerUrl, setBrandBannerUrl] = useState(
    saved.brandBannerUrl ?? getBrandImageUrl(initialBrandId),
  );
  const [productTitle, setProductTitle] = useState(initialTitle);
  const [productImageUrl, setProductImageUrl] = useState(
    saved.productImageUrl ?? DEFAULT_PRODUCT_IMAGE,
  );
  const [autoFill, setAutoFill] = useState(saved.autoFill ?? true);
  const [specifications, setSpecifications] = useState(
    saved.specifications ?? initialGenerated.specifications,
  );
  const [contents, setContents] = useState(saved.contents ?? initialGenerated.contents);
  const [english, setEnglish] = useState(saved.english ?? initialGenerated.english);
  const [spanish, setSpanish] = useState(saved.spanish ?? initialGenerated.spanish);
  const [portuguese, setPortuguese] = useState(
    saved.portuguese ?? initialGenerated.portuguese,
  );
  const [footerSections, setFooterSections] = useState<FooterSection[]>(
    getInitialFooterSections,
  );
  const [footerSavedAt, setFooterSavedAt] = useState<string | null>(getFooterSavedAt);
  const [footerStatus, setFooterStatus] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showFooterEditor, setShowFooterEditor] = useState(false);
  const [copied, setCopied] = useState<"html" | "text" | null>(null);
  const [previewMode, setPreviewMode] = useState<"preview" | "html">("preview");

  useEffect(() => {
    if (!autoFill || !productTitle.trim()) return;
    applyGeneratedFields(productTitle, {
      setSpecifications,
      setContents,
      setEnglish,
      setSpanish,
      setPortuguese,
      setBrandId,
      setBrandBannerUrl,
    });
  }, [productTitle, autoFill]);

  const input: DescriptionInput = useMemo(
    () => ({
      productTitle,
      productImageUrl,
      brandBannerUrl,
      specifications,
      contents,
      english,
      spanish,
      portuguese,
      footerSections,
    }),
    [
      productTitle,
      productImageUrl,
      brandBannerUrl,
      specifications,
      contents,
      english,
      spanish,
      portuguese,
      footerSections,
    ],
  );

  const html = useMemo(() => renderEbayDescription(input), [input]);
  const plainText = useMemo(() => renderPlainText(input), [input]);

  const persistDraft = useCallback(() => {
    const draft: Draft = {
      brandId,
      brandBannerUrl,
      productTitle,
      productImageUrl,
      autoFill,
      specifications,
      contents,
      english,
      spanish,
      portuguese,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    brandId,
    brandBannerUrl,
    productTitle,
    productImageUrl,
    autoFill,
    specifications,
    contents,
    english,
    spanish,
    portuguese,
  ]);

  const handleBannerSelect = (id: string, url: string) => {
    setBrandId(id);
    setBrandBannerUrl(url);
  };

  const handleImageApply = (target: "banner" | "product", dataUrl: string) => {
    if (target === "banner") setBrandBannerUrl(dataUrl);
    else setProductImageUrl(dataUrl);
  };

  const regenerateFromTitle = () => {
    setAutoFill(true);
    applyGeneratedFields(productTitle, {
      setSpecifications,
      setContents,
      setEnglish,
      setSpanish,
      setPortuguese,
      setBrandId,
      setBrandBannerUrl,
    });
  };

  const markManualEdit = () => setAutoFill(false);

  const updateFooterSection = (index: number, patch: Partial<FooterSection>) => {
    setFooterSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  const handleSaveFooter = () => {
    saveFooterPolicy(footerSections);
    setFooterSavedAt(getFooterSavedAt());
    setFooterStatus("스토어 정책이 저장되었습니다.");
    setTimeout(() => setFooterStatus(null), 2500);
  };

  const handleResetFooter = () => {
    if (!confirm("스토어 정책을 기본값으로 되돌릴까요?")) return;
    clearSavedFooter();
    setFooterSections(DEFAULT_FOOTER_SECTIONS);
    setFooterSavedAt(null);
    setFooterStatus("기본값으로 복원되었습니다.");
    setTimeout(() => setFooterStatus(null), 2500);
  };

  const copyToClipboard = async (mode: "html" | "text") => {
    await navigator.clipboard.writeText(mode === "html" ? html : plainText);
    setCopied(mode);
    persistDraft();
    setTimeout(() => setCopied(null), 2000);
  };

  const resetForm = () => {
    if (!confirm("입력 내용을 초기화할까요?")) return;
    setProductTitle(DEFAULT_PRODUCT_TITLE);
    setProductImageUrl(DEFAULT_PRODUCT_IMAGE);
    setAutoFill(true);
    applyGeneratedFields(DEFAULT_PRODUCT_TITLE, {
      setSpecifications,
      setContents,
      setEnglish,
      setSpanish,
      setPortuguese,
      setBrandId,
      setBrandBannerUrl,
    });
    localStorage.removeItem(DRAFT_KEY);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              KstarForAll · 가방 리스팅 빌더
            </h1>
            <p className="text-sm text-slate-500">
              제목만 입력 → 명세·설명 자동 생성 → HTML 복사 또는 eBay 자동 게시
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard("html")}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              {copied === "html" ? "복사됨!" : "HTML 복사"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              초기화
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-slate-800">1. 리스팅 제목</h2>
            <p className="mb-4 text-xs text-slate-500">
              eBay 제목을 입력하면 Specification, What's in the box, EN/ES/PT 설명,
              브랜드 배너가 자동으로 채워집니다.
            </p>
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              placeholder="Marc Jacobs The Leather Bucket Bag H652L01PF22"
              className={`${inputClass} text-base`}
            />
            {!autoFill ? (
              <p className="mt-2 text-xs text-amber-700">
                수동 수정 중 ·{" "}
                <button
                  type="button"
                  onClick={regenerateFromTitle}
                  className="underline hover:text-amber-900"
                >
                  제목에서 다시 생성
                </button>
              </p>
            ) : (
              <p className="mt-2 text-xs text-green-700">자동 생성 켜짐</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              2. 대표 이미지 (선택)
            </h2>
            <input
              type="url"
              value={productImageUrl}
              onChange={(e) => setProductImageUrl(e.target.value)}
              placeholder="https://i.ebayimg.com/images/g/..."
              className={inputClass}
            />
            {productImageUrl ? (
              <img
                src={productImageUrl}
                alt="product"
                className="mx-auto mt-3 max-h-40 object-contain"
              />
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                이미지 URL을 넣으면 설명란 중앙에 표시됩니다. 아래 도구에서 변환 후
                적용할 수도 있습니다.
              </p>
            )}
          </div>

          <EbayPublishPanel
            productTitle={productTitle}
            descriptionHtml={html}
            productImageUrl={productImageUrl}
            brandBannerUrl={brandBannerUrl}
          />

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-slate-800">
                세부 내용 수정 (선택)
              </span>
              <span className="text-sm text-violet-600">
                {showAdvanced ? "접기" : "펼치기"}
              </span>
            </button>
            {showAdvanced ? (
              <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Specification</span>
                  <textarea
                    rows={6}
                    value={specifications}
                    onChange={(e) => {
                      markManualEdit();
                      setSpecifications(e.target.value);
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    What's in the box?
                  </span>
                  <textarea
                    rows={3}
                    value={contents}
                    onChange={(e) => {
                      markManualEdit();
                      setContents(e.target.value);
                    }}
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={regenerateFromTitle}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  제목에서 다시 생성
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowTools((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-slate-800">
                배너 · 이미지 변환
              </span>
              <span className="text-sm text-violet-600">{showTools ? "접기" : "펼치기"}</span>
            </button>
            {showTools ? (
              <div className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-4">
                <BannerPicker
                  brandId={brandId}
                  bannerUrl={brandBannerUrl}
                  onSelect={handleBannerSelect}
                  onBannerUrlChange={setBrandBannerUrl}
                />
                <ImageResizeTool onApply={handleImageApply} />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowFooterEditor((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  스토어 정책 (공통 하단)
                </span>
                {footerSavedAt ? (
                  <p className="mt-0.5 text-xs text-green-700">
                    저장됨 · {formatSavedAt(footerSavedAt)}
                  </p>
                ) : null}
              </div>
              <span className="text-sm text-violet-600">
                {showFooterEditor ? "접기" : "펼치기"}
              </span>
            </button>
            {showFooterEditor ? (
              <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
                {footerSections.map((section, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2"
                  >
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        updateFooterSection(index, { title: e.target.value })
                      }
                      className={inputClass}
                    />
                    <textarea
                      rows={3}
                      value={section.body}
                      onChange={(e) =>
                        updateFooterSection(index, { body: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFooter}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                  >
                    정책 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFooter}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    기본값 복원
                  </button>
                  {footerStatus ? (
                    <span className="self-center text-sm text-green-600">{footerStatus}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewMode("preview")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  previewMode === "preview"
                    ? "border-b-2 border-violet-600 text-violet-700"
                    : "text-slate-500"
                }`}
              >
                미리보기
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("html")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  previewMode === "html"
                    ? "border-b-2 border-violet-600 text-violet-700"
                    : "text-slate-500"
                }`}
              >
                HTML
              </button>
            </div>
            <div className="max-h-[calc(100vh-8rem)] overflow-auto p-2">
              {previewMode === "preview" ? (
                <div
                  className="mx-auto bg-white"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {html}
                </pre>
              )}
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              eBay → Description → <strong>Show HTML Code</strong> → 붙여넣기
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
