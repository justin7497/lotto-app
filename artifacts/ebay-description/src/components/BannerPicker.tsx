import { useRef, useState } from "react";
import {
  getBrandImageUrl,
  loadBrandUrls,
  PRESET_BRANDS,
  saveBrandUrl,
  type Brand,
} from "@/data/brands";
import { IMAGE_ACCEPT, isImageFile } from "@/utils/imageFile";

type Props = {
  brandId: string;
  bannerUrl: string;
  onSelect: (brandId: string, bannerUrl: string) => void;
  onBannerUrlChange: (url: string) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export default function BannerPicker({
  brandId,
  bannerUrl,
  onSelect,
  onBannerUrlChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [brandUrls, setBrandUrls] = useState(loadBrandUrls);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const selectedBrand =
    PRESET_BRANDS.find((b) => b.id === brandId) ?? PRESET_BRANDS[0]!;

  const refreshUrls = () => setBrandUrls(loadBrandUrls());

  const handlePickBrand = (brand: Brand) => {
    const url = getBrandImageUrl(brand.id);
    onSelect(brand.id, url);
  };

  const handleSaveBanner = () => {
    saveBrandUrl(brandId, bannerUrl);
    refreshUrls();
    setSavedHint(`${selectedBrand.name} 배너 저장됨`);
    setTimeout(() => setSavedHint(null), 2000);
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file || !isImageFile(file)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) onBannerUrlChange(result);
    };
    reader.readAsDataURL(file);
  };

  const isDataUrl = bannerUrl.startsWith("data:");

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">배너 선택 (클릭 즉시 적용)</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {PRESET_BRANDS.filter((b) => b.id !== "custom").map((brand) => {
            const url = brandUrls[brand.id] ?? "";
            const active = brandId === brand.id;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => handlePickBrand(brand)}
                className={`overflow-hidden rounded-lg border-2 text-left transition ${
                  active
                    ? "border-violet-500 ring-2 ring-violet-100"
                    : "border-slate-200 hover:border-violet-300"
                }`}
              >
                <div className="flex h-16 items-center justify-center bg-slate-50">
                  {url ? (
                    <img
                      src={url}
                      alt={brand.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="px-1 text-center text-[10px] font-medium text-slate-400">
                      {brand.name}
                    </span>
                  )}
                </div>
                <p className="truncate bg-white px-1.5 py-1 text-[11px] font-medium text-slate-600">
                  {brand.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">
          {selectedBrand.name} 배너 편집
        </p>

        {bannerUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              src={bannerUrl}
              alt="banner preview"
              className="max-h-32 w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).alt = "이미지를 불러올 수 없습니다";
              }}
            />
          </div>
        ) : null}

        <input
          type="url"
          value={isDataUrl ? "" : bannerUrl}
          onChange={(e) => onBannerUrlChange(e.target.value)}
          placeholder="https://gi.esmplus.com/... 또는 i.ebayimg.com"
          className={inputClass}
        />

        {isDataUrl ? (
          <p className="text-xs text-amber-700">
            로컬 이미지가 적용되었습니다. eBay 등록용으로는 호스팅 URL로 저장하는 것을
            권장합니다.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            파일에서 불러오기
          </button>
          <button
            type="button"
            onClick={handleSaveBanner}
            disabled={!bannerUrl.trim()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
          >
            이 브랜드에 저장
          </button>
          {savedHint ? (
            <span className="self-center text-sm text-green-600">{savedHint}</span>
          ) : null}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFileUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <p className="text-xs text-slate-500">
          브랜드 카드를 클릭하면 저장된 배너가 바로 적용됩니다. URL 입력 또는 파일
          업로드 후 「이 브랜드에 저장」을 누르면 다음에도 유지됩니다.
        </p>
      </div>
    </div>
  );
}
