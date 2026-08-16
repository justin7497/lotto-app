import { useCallback, useEffect, useMemo, useState } from "react";
import { extractModelCode } from "@/utils/bagListingGenerator";
import {
  disconnectEbay,
  fetchEbayAuthUrl,
  fetchEbaySetup,
  fetchEbayStatus,
  publishEbayListing,
  type EbaySetup,
} from "@/lib/ebayApi";

type Props = {
  productTitle: string;
  descriptionHtml: string;
  productImageUrl: string;
  brandBannerUrl: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const DEFAULT_CATEGORY = "169291";

function buildImageUrls(productImageUrl: string, extraUrls: string): string[] {
  const lines = extraUrls
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const urls = [productImageUrl.trim(), ...lines].filter(Boolean);
  return [...new Set(urls)];
}

export default function EbayPublishPanel({
  productTitle,
  descriptionHtml,
  productImageUrl,
  brandBannerUrl,
}: Props) {
  const [status, setStatus] = useState<{
    connected: boolean;
    configured?: boolean;
    env?: string;
  } | null>(null);
  const [setup, setSetup] = useState<EbaySetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY);
  const [extraImageUrls, setExtraImageUrls] = useState("");
  const [listingUrl, setListingUrl] = useState<string | null>(null);

  const suggestedSku = useMemo(() => {
    const model = extractModelCode(productTitle);
    if (model) return model;
    return `BAG-${Date.now().toString(36).toUpperCase()}`;
  }, [productTitle]);

  const imageUrls = useMemo(
    () => buildImageUrls(productImageUrl, extraImageUrls),
    [productImageUrl, extraImageUrls],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextStatus = await fetchEbayStatus();
      setStatus(nextStatus);
      if (nextStatus.connected) {
        const nextSetup = await fetchEbaySetup();
        setSetup(nextSetup);
      } else {
        setSetup(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ebay = params.get("ebay");
    if (!ebay) return;

    if (ebay === "connected") {
      setMessage("eBay 계정이 연결되었습니다.");
    } else if (ebay === "error") {
      setError(params.get("reason") || "eBay 연결에 실패했습니다.");
    }

    params.delete("ebay");
    params.delete("env");
    params.delete("reason");
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ""}`;
    window.history.replaceState({}, "", url);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!sku && suggestedSku) setSku(suggestedSku);
  }, [suggestedSku, sku]);

  const handleConnect = async () => {
    setError(null);
    try {
      const { url } = await fetchEbayAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("eBay 연결을 해제할까요?")) return;
    setError(null);
    try {
      await disconnectEbay();
      setMessage("연결이 해제되었습니다.");
      setListingUrl(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePublish = async () => {
    setError(null);
    setMessage(null);
    setListingUrl(null);

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("가격을 입력하세요.");
      return;
    }
    if (!imageUrls.length) {
      setError("공개 이미지 URL이 최소 1개 필요합니다. (대표 이미지 또는 추가 URL)");
      return;
    }

    setPublishing(true);
    try {
      const result = await publishEbayListing({
        title: productTitle,
        descriptionHtml,
        sku: sku.trim() || suggestedSku,
        price: parsedPrice,
        quantity: Math.max(1, Number(quantity) || 1),
        categoryId,
        imageUrls,
        fulfillmentPolicyId: setup?.defaults.fulfillmentPolicy?.id,
        paymentPolicyId: setup?.defaults.paymentPolicy?.id,
        returnPolicyId: setup?.defaults.returnPolicy?.id,
        locationKey: setup?.defaults.location?.key,
      });

      setMessage("리스팅이 게시되었습니다.");
      if (result.listingUrl) setListingUrl(result.listingUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-500">
        eBay 연결 상태 확인 중…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">3. eBay 자동 리스팅</h2>
        <p className="mt-1 text-xs text-slate-500">
          OAuth 연결 후 Inventory API로 제목·설명·이미지·가격을 자동 게시합니다.
        </p>
      </div>

      {status?.configured === false ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Firebase Functions에 <strong>EBAY_CLIENT_ID</strong>,{" "}
          <strong>EBAY_CLIENT_SECRET</strong>, <strong>EBAY_REDIRECT_URI</strong>를
          설정해야 합니다. eBay Developer에서 Redirect URI를{" "}
          <code className="text-[11px]">https://kpopday-ebay.web.app/api/ebay/auth/callback</code>
          로 등록하세요.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {status?.connected ? (
          <>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              연결됨 · {status.env ?? "sandbox"}
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              연결 해제
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={status?.configured === false}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            eBay 계정 연결
          </button>
        )}
      </div>

      {setup ? (
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600 space-y-1">
          <p>
            배송: {setup.defaults.fulfillmentPolicy?.name ?? "—"} · 결제:{" "}
            {setup.defaults.paymentPolicy?.name ?? "—"} · 반품:{" "}
            {setup.defaults.returnPolicy?.name ?? "—"}
          </p>
          <p>재고 위치: {setup.defaults.location?.name ?? "—"}</p>
        </div>
      ) : status?.connected ? (
        <p className="text-xs text-amber-700">
          Seller Hub에서 Business Policies와 Inventory Location을 먼저 설정하세요.
        </p>
      ) : null}

      {status?.connected ? (
        <div className="space-y-3 border-t border-emerald-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">SKU</span>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={suggestedSku}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">가격 (USD)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="299.00"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">수량</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">카테고리 ID</span>
              <input
                type="text"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">
              추가 이미지 URL (줄바꿈, 선택)
            </span>
            <textarea
              rows={3}
              value={extraImageUrls}
              onChange={(e) => setExtraImageUrls(e.target.value)}
              placeholder={brandBannerUrl ? "배너는 설명 HTML에 포함됩니다. 갤러리용 공개 URL만 추가하세요." : ""}
              className={inputClass}
            />
          </label>

          <p className="text-xs text-slate-500">
            게시 이미지 {imageUrls.length}개
            {productImageUrl ? "" : " · 대표 이미지 URL을 입력하세요"}
          </p>

          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={publishing || !productTitle.trim()}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {publishing ? "게시 중…" : "eBay에 리스팅 게시"}
          </button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {listingUrl ? (
        <a
          href={listingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-emerald-700 underline"
        >
          eBay에서 리스팅 보기
        </a>
      ) : null}
    </div>
  );
}
