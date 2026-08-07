import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminEmail } from "@/config/admin";
import {
  WISH_CATEGORIES,
  type WishCategory,
  type WishCategoryId,
} from "@/data/wishPhrases";
import {
  fetchAdminStats,
  fetchAdminWishPhrases,
  fetchPushTargets,
  resetAdminWishPhrases,
  saveAdminWishPhrases,
  sendAdminTestPush,
  syncAdminDevice,
  type AdminStats,
  type PushDeliveryResult,
  type PushTargetsResponse,
} from "@/utils/adminApi";
import { clearWishCategoriesCache } from "@/utils/wishPhrasesConfig";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import {
  ensurePushRegistration,
  type PushRegistrationStatus,
} from "@/utils/ensurePushRegistration";
import { subscribeForegroundMessages } from "@/lib/messaging";

export type AdminTab = "push" | "wishes" | "stats" | "campaigns";

export function formatAdminDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR");
}

export function useAdminPage() {
  const { user, isLoaded, isSignedIn, signInWithEmail } = useAuth();
  const [tab, setTab] = useState<AdminTab>("stats");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const isAdmin = isAdminEmail(user?.email);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [wishCategories, setWishCategories] = useState<WishCategory[]>(() => [...WISH_CATEGORIES]);
  const [wishSource, setWishSource] = useState<"default" | "remote">("default");
  const [wishUpdatedAt, setWishUpdatedAt] = useState<string | null>(null);
  const [wishUpdatedBy, setWishUpdatedBy] = useState<string | null>(null);
  const [wishLoading, setWishLoading] = useState(false);
  const [wishSaving, setWishSaving] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<WishCategoryId>("secret");
  const [newPhrase, setNewPhrase] = useState("");

  const [pushTitle, setPushTitle] = useState("소원로또 테스트");
  const [pushBody, setPushBody] = useState("관리자 테스트 알림입니다.");
  const [pushLink, setPushLink] = useState("/");
  const [pushChannel, setPushChannel] = useState<"self" | "device" | "engagement-all">("self");
  const [pushDeviceId, setPushDeviceId] = useState(() => getOrCreateDeviceId());
  const [pushSending, setPushSending] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus | null>(null);
  const [pushRegistering, setPushRegistering] = useState(false);
  const [pushTargets, setPushTargets] = useState<PushTargetsResponse | null>(null);
  const [pushDeliveries, setPushDeliveries] = useState<PushDeliveryResult[] | null>(null);

  const activeCategory = useMemo(
    () => wishCategories.find((category) => category.id === activeCategoryId) ?? wishCategories[0],
    [wishCategories, activeCategoryId],
  );

  const phraseTotal = useMemo(
    () => wishCategories.reduce((sum, category) => sum + category.phrases.length, 0),
    [wishCategories],
  );

  useEffect(() => {
    if (!message && !error) return;
    const t = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [message, error]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "현황을 불러오지 못했습니다.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadWishPhrases = useCallback(async () => {
    setWishLoading(true);
    try {
      const data = await fetchAdminWishPhrases();
      setWishSource(data.source);
      setWishUpdatedAt(data.updatedAt);
      setWishUpdatedBy(data.updatedBy);
      if (data.categories && data.categories.length > 0) {
        setWishCategories(data.categories);
        setActiveCategoryId(data.categories[0]!.id);
      } else {
        setWishCategories([...WISH_CATEGORIES]);
        setActiveCategoryId(WISH_CATEGORIES[0]!.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "소원 문구를 불러오지 못했습니다.");
    } finally {
      setWishLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "stats") void loadStats();
    if (tab === "wishes") void loadWishPhrases();
    if (tab === "push") void loadStats();
  }, [isAdmin, tab, loadStats, loadWishPhrases]);

  const refreshPushStatus = useCallback(async () => {
    if (!user) return;
    setPushRegistering(true);
    try {
      const status = await ensurePushRegistration(user.uid);
      setPushStatus(status);
      setPushDeviceId(status.deviceId);
      await syncAdminDevice(status.deviceId).catch(() => {});
      const targets = await fetchPushTargets(status.deviceId);
      setPushTargets(targets);
      if (status.engagementRegistered || status.userTokenRegistered) {
        setMessage("이 기기 알림 등록을 완료했습니다.");
      } else if (status.hint) {
        setError(status.hint);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알림 등록에 실패했습니다.");
    } finally {
      setPushRegistering(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAdmin || tab !== "push" || !user) return;
    void refreshPushStatus();
  }, [isAdmin, tab, user, refreshPushStatus]);

  useEffect(() => {
    if (!isAdmin || tab !== "push") return undefined;
    let cleanup: (() => void) | null = null;
    void subscribeForegroundMessages((title, body) => {
      setMessage(`수신됨 · ${title} — ${body}`);
    }).then((unsub) => {
      cleanup = unsub;
    });
    return () => cleanup?.();
  }, [isAdmin, tab]);

  const handleLogin = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setLoginError(null);
      setLoginBusy(true);
      try {
        await signInWithEmail(loginEmail.trim(), loginPassword);
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      } finally {
        setLoginBusy(false);
      }
    },
    [loginEmail, loginPassword, signInWithEmail],
  );

  const handleSaveWishPhrases = useCallback(async () => {
    setWishSaving(true);
    setError(null);
    try {
      await saveAdminWishPhrases(wishCategories);
      clearWishCategoriesCache();
      setWishSource("remote");
      setWishUpdatedAt(new Date().toISOString());
      setWishUpdatedBy(user?.email ?? null);
      setMessage("소원 문구를 저장했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setWishSaving(false);
    }
  }, [user?.email, wishCategories]);

  const handleResetWishPhrases = useCallback(async () => {
    if (!window.confirm("Firestore에 저장된 소원 문구를 삭제하고 앱 기본 문구로 되돌릴까요?")) return;
    setWishSaving(true);
    setError(null);
    try {
      await resetAdminWishPhrases();
      clearWishCategoriesCache();
      setWishCategories([...WISH_CATEGORIES]);
      setWishSource("default");
      setWishUpdatedAt(null);
      setWishUpdatedBy(null);
      setMessage("기본 소원 문구로 되돌렸습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "되돌리기에 실패했습니다.");
    } finally {
      setWishSaving(false);
    }
  }, []);

  const updateActivePhrases = useCallback(
    (updater: (phrases: string[]) => string[]) => {
      if (!activeCategory) return;
      setWishCategories((prev) =>
        prev.map((category) =>
          category.id === activeCategory.id
            ? { ...category, phrases: updater([...category.phrases]) }
            : category,
        ),
      );
    },
    [activeCategory],
  );

  const handleSendTestPush = useCallback(async () => {
    if (!user) return;
    setPushSending(true);
    setError(null);
    try {
      const status = await ensurePushRegistration(user.uid);
      setPushStatus(status);
      if (!status.engagementRegistered && !status.userTokenRegistered) {
        setError(status.hint ?? "알림 토큰이 없습니다. 「이 기기 알림 등록」을 먼저 눌러 주세요.");
        return;
      }

      const result = await sendAdminTestPush({
        channel: pushChannel,
        title: pushTitle,
        body: pushBody,
        link: pushLink,
        deviceId: pushChannel === "device" ? pushDeviceId : undefined,
        currentDeviceId: getOrCreateDeviceId(),
      });
      setPushDeliveries(result.deliveries ?? null);
      if (!result.ok) {
        setError(result.message ?? result.errors?.[0] ?? "푸시 발송에 실패했습니다.");
        return;
      }
      const androidOk =
        result.deliveries?.filter((row) => row.platform === "android-app" && row.ok).length ?? 0;
      const pcOk =
        result.deliveries?.filter((row) => row.platform !== "android-app" && row.ok).length ?? 0;
      setMessage(
        `푸시 발송 완료 · 성공 ${result.sent} / 토큰 ${result.tokens}` +
          (androidOk || pcOk ? ` (PC ${pcOk}, 폰 ${androidOk})` : "") +
          (result.failed ? ` · 실패 ${result.failed}` : ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "푸시 발송에 실패했습니다.");
    } finally {
      setPushSending(false);
    }
  }, [user, pushChannel, pushTitle, pushBody, pushLink, pushDeviceId]);

  const openPushTestForDevice = useCallback((deviceId: string) => {
    setPushChannel("device");
    setPushDeviceId(deviceId);
    setTab("push");
    setMessage("알림 테스트 탭에서 선택한 기기로 발송할 수 있습니다.");
  }, []);

  return {
    user,
    isLoaded,
    isSignedIn,
    isAdmin,
    tab,
    setTab,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginError,
    loginBusy,
    message,
    error,
    setMessage,
    setError,
    stats,
    statsLoading,
    loadStats,
    wishCategories,
    wishSource,
    wishUpdatedAt,
    wishUpdatedBy,
    wishLoading,
    wishSaving,
    activeCategoryId,
    setActiveCategoryId,
    newPhrase,
    setNewPhrase,
    activeCategory,
    phraseTotal,
    loadWishPhrases,
    handleLogin,
    handleSaveWishPhrases,
    handleResetWishPhrases,
    updateActivePhrases,
    pushTitle,
    setPushTitle,
    pushBody,
    setPushBody,
    pushLink,
    setPushLink,
    pushChannel,
    setPushChannel,
    pushDeviceId,
    setPushDeviceId,
    pushSending,
    pushStatus,
    pushRegistering,
    pushTargets,
    pushDeliveries,
    refreshPushStatus,
    handleSendTestPush,
    openPushTestForDevice,
  };
}

export type AdminPageState = ReturnType<typeof useAdminPage>;
