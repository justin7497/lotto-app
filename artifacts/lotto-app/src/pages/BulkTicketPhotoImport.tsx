import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import LottoBall from "@/components/LottoBall";
import PageCard from "@/components/PageCard";
import { TrustStepGuide } from "@/components/TrustUI";
import {
  createBulkPhotoItems,
  MAX_BULK_TICKET_PHOTOS,
  processBulkPhotoFiles,
  revokeBulkPhotoPreviews,
  saveBulkImportedTickets,
  type BulkPhotoImportItem,
} from "@/utils/bulkTicketPhotoImport";
import { isAppWebViewShell } from "@/utils/nativeQrBridge";

const PHOTO_STEPS = [
  { step: "1", text: "QR 사진 여러 장 선택", icon: ImagePlus },
  { step: "2", text: "확인 후 나의 번호에 저장", icon: Save },
] as const;

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name);
}

export default function BulkTicketPhotoImport() {
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const pickDisabledRef = useRef(false);

  const [items, setItems] = useState<BulkPhotoImportItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const okItems = useMemo(
    () => items.filter((item) => item.status === "ok" && item.ticket),
    [items],
  );
  const errorCount = items.filter((item) => item.status === "error").length;
  const totalGames = okItems.reduce((sum, item) => sum + (item.ticket?.gameCount ?? 0), 0);
  const canSave = okItems.length > 0 && !processing && !saving;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => revokeBulkPhotoPreviews(itemsRef.current);
  }, []);

  function resetAll() {
    revokeBulkPhotoPreviews(items);
    filesRef.current = [];
    setItems([]);
    setSaveMessage(null);
    setSaveError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter(isImageFile);
    if (files.length === 0) {
      setSaveError("이미지 파일(JPG·PNG 등)을 선택해 주세요.");
      return;
    }

    revokeBulkPhotoPreviews(itemsRef.current);
    filesRef.current = [];
    setSaveMessage(null);
    setSaveError(null);
    if (inputRef.current) inputRef.current.value = "";

    setProcessing(true);
    pickDisabledRef.current = true;

    const nextItems = createBulkPhotoItems(files);
    filesRef.current = files.slice(0, MAX_BULK_TICKET_PHOTOS);
    setItems(nextItems);

    try {
      await processBulkPhotoFiles(filesRef.current, (index, patch) => {
        setItems((prev) =>
          prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        );
      });
    } finally {
      setProcessing(false);
      pickDisabledRef.current = false;
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const tickets = okItems
      .map((item) => item.ticket)
      .filter((ticket): ticket is NonNullable<typeof ticket> => Boolean(ticket));

    const summary = await saveBulkImportedTickets(tickets);
    setSaving(false);

    if (summary.savedTickets === 0) {
      setSaveError(
        summary.errors[0] ??
          "저장에 실패했습니다. 이미 등록된 번호이거나 저장할 게임이 없습니다.",
      );
      return;
    }

    const parts = [
      `티켓 ${summary.savedTickets}장`,
      `게임 ${summary.savedGames}개`,
    ];
    if (summary.skipped > 0) {
      parts.push(`건너뜀 ${summary.skipped}장`);
    }
    setSaveMessage(`${parts.join(" · ")} 저장했습니다.`);
    revokeBulkPhotoPreviews(items);
    filesRef.current = [];
    setItems([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="page-content page-content--loose bulk-ticket-import">
      <PageCard className="bulk-ticket-import__card">
        <p className="bulk-ticket-import__lead page-inline-notice">
          실물 복권 QR 사진을 여러 장 한꺼번에 선택하면 나의 로또번호로 저장합니다.
        </p>

        <TrustStepGuide
          compact
          layout="list"
          lead="갤러리에서 티켓 사진을 고르면 번호를 자동으로 읽어요"
          steps={[...PHOTO_STEPS]}
        />

        {isAppWebViewShell() ? (
          <p className="bulk-ticket-import__app-note" role="note">
            소원로또 앱에서 갤러리가 열리지 않으면 Play 스토어에서 앱을{" "}
            <strong>1.0.25</strong> 이상으로 업데이트해 주세요.
          </p>
        ) : null}

        <div className="bulk-ticket-import__actions">
          <label
            className={`page-cta page-cta--teal w-full bulk-ticket-import__pick${
              processing || saving ? " bulk-ticket-import__pick--disabled" : ""
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="bulk-ticket-import__file-input"
              disabled={processing || saving}
              onChange={(event) => {
                void handleFilesSelected(event.target.files);
                event.target.value = "";
              }}
            />
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                QR 인식 중…
              </>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" aria-hidden />
                티켓 QR 사진 선택
              </>
            )}
          </label>
          <p className="bulk-ticket-import__pick-hint">여러 장 한꺼번에 선택 가능</p>

          {items.length > 0 ? (
            <button
              type="button"
              className="bulk-ticket-import__reset"
              disabled={processing || saving}
              onClick={resetAll}
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              다시 선택
            </button>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div className="bulk-ticket-import__summary" role="status">
            <p>
              전체 <strong>{items.length}</strong>장 · 성공{" "}
              <strong className="text-emerald-700">{okItems.length}</strong> · 실패{" "}
              <strong className="text-red-600">{errorCount}</strong>
              {okItems.length > 0 ? (
                <>
                  {" "}
                  · 게임 <strong>{totalGames}</strong>개
                </>
              ) : null}
            </p>
            {processing ? (
              <p className="bulk-ticket-import__progress">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                사진에서 QR을 읽는 중입니다…
              </p>
            ) : null}
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul className="bulk-ticket-import__list">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`bulk-ticket-import__item bulk-ticket-import__item--${item.status}`}
              >
                <div className="bulk-ticket-import__thumb-wrap">
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="bulk-ticket-import__thumb"
                    loading="lazy"
                  />
                  <span className="bulk-ticket-import__index">{index + 1}</span>
                </div>

                <div className="bulk-ticket-import__body">
                  <p className="bulk-ticket-import__file-name">{item.fileName}</p>

                  {item.status === "processing" ? (
                    <p className="bulk-ticket-import__status bulk-ticket-import__status--pending">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      인식 중
                    </p>
                  ) : null}

                  {item.status === "ok" && item.ticket ? (
                    <>
                      <p className="bulk-ticket-import__status bulk-ticket-import__status--ok">
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                        {item.ticket.roundTag} · {item.ticket.gameCount}게임
                      </p>
                      <ul className="bulk-ticket-import__games">
                        {item.ticket.games.map((game, gameIndex) => (
                          <li key={`${item.id}-g-${gameIndex}`}>
                            <span className="bulk-ticket-import__game-label">
                              {String.fromCharCode(65 + gameIndex)}
                            </span>
                            {game.mode === "A" || game.numbers.length === 0 ? (
                              <span className="bulk-ticket-import__game-auto">자동</span>
                            ) : (
                              <span className="bulk-ticket-import__game-balls">
                                {game.numbers.map((n) => (
                                  <LottoBall key={n} number={n} size="sm" />
                                ))}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {item.status === "error" ? (
                    <p className="bulk-ticket-import__status bulk-ticket-import__status--error">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                      {item.error ?? "인식 실패"}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bulk-ticket-import__tips">
            <p className="bulk-ticket-import__tips-title">촬영 팁</p>
            <ul>
              <li>복권 <strong>우측 상단 QR</strong>이 사진 안에 들어오게 찍어 주세요.</li>
              <li>밝은 곳에서 찍고, 흔들림·반사가 없으면 인식이 잘 됩니다.</li>
            </ul>
          </div>
        )}
      </PageCard>

      {items.length > 0 && !processing ? (
        <div className="bulk-ticket-import__footer">
          <button
            type="button"
            className="page-cta page-cta--teal w-full"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                저장 중…
              </>
            ) : (
              <>
                <Save className="w-5 h-5" aria-hidden />
                나의 번호에 저장 ({okItems.length}장 · {totalGames}게임)
              </>
            )}
          </button>
        </div>
      ) : null}

      {saveMessage ? (
        <p className="bulk-ticket-import__toast bulk-ticket-import__toast--ok" role="status">
          {saveMessage}{" "}
          <button
            type="button"
            className="bulk-ticket-import__toast-link"
            onClick={() => navigate("/saved-numbers")}
          >
            나의 로또번호 보기
          </button>
        </p>
      ) : null}

      {saveError ? (
        <p className="bulk-ticket-import__toast bulk-ticket-import__toast--error" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
