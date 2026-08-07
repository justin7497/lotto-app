import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { requestPasswordReset } from "@/utils/passwordResetApi";
import {
  notifySavedSetsInvalidate,
  setSavedNumbersUserIdGetter,
} from "@/utils/savedNumbers";
import {
  notifyFavoritePicksInvalidate,
  setFavoritePicksUserIdGetter,
} from "@/utils/favoriteNumbers";
import { clearUserLocalData, deleteUserFirestoreData } from "@/utils/accountDeletion";
import { ensureAuthTokenReady } from "@/utils/authReady";
import { linkDeviceToUser } from "@/utils/deviceEngagement";
import { registerDeviceEngagementPush, registerPushToken } from "@/lib/messaging";
import { syncUserCloudData } from "@/utils/userCloudSync";

interface AuthContextValue {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ resetUrl?: string; emailed: boolean }>;
  completePasswordReset: {
    verifyCode: (oobCode: string) => Promise<string>;
    apply: (oobCode: string, newPassword: string) => Promise<void>;
  };
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(!isFirebaseConfigured);
  const qc = useQueryClient();
  const prevUidRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setSavedNumbersUserIdGetter(null);
      setFavoritePicksUserIdGetter(null);
      setIsLoaded(true);
      return;
    }

    let settled = false;
    const authTimeout = window.setTimeout(() => {
      if (!settled) {
        setSavedNumbersUserIdGetter(null);
        setFavoritePicksUserIdGetter(null);
        setIsLoaded(true);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      settled = true;
      window.clearTimeout(authTimeout);

      setUser(nextUser);
      setIsLoaded(true);
      const getter = nextUser ? () => nextUser.uid : null;
      setSavedNumbersUserIdGetter(getter);
      setFavoritePicksUserIdGetter(getter);

      const nextUid = nextUser?.uid ?? null;
      if (prevUidRef.current !== undefined && prevUidRef.current !== nextUid) {
        qc.clear();
        notifySavedSetsInvalidate();
        notifyFavoritePicksInvalidate();
      }
      prevUidRef.current = nextUid;

      if (nextUser) {
        void (async () => {
          try {
            await ensureAuthTokenReady(true);
            await syncUserCloudData();
            const engagementToken = await registerDeviceEngagementPush();
            await registerPushToken(nextUser.uid);
            await linkDeviceToUser(nextUser.uid, engagementToken);
          } catch {
            /* 로그인 직후 클라우드 동기화 실패는 앱 사용을 막지 않음 */
          }
        })();
      }
    });

    return () => {
      window.clearTimeout(authTimeout);
      unsubscribe();
      setSavedNumbersUserIdGetter(null);
      setFavoritePicksUserIdGetter(null);
    };
  }, [qc]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth가 설정되지 않았습니다");
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth가 설정되지 않았습니다");
    auth.languageCode = "ko";
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await sendEmailVerification(credential.user);
  }, []);

  const requestPasswordResetFn = useCallback(async (email: string) => {
    if (!auth) throw new Error("Firebase Auth가 설정되지 않았습니다");
    const trimmed = email.trim();
    if (!trimmed) throw new Error("이메일을 입력해 주세요.");
    return requestPasswordReset(trimmed);
  }, []);

  const completePasswordReset = useMemo(
    () => ({
      verifyCode: async (oobCode: string) => {
        if (!auth) throw new Error("Firebase Auth가 설정되지 않았습니다");
        return verifyPasswordResetCode(auth, oobCode);
      },
      apply: async (oobCode: string, newPassword: string) => {
        if (!auth) throw new Error("Firebase Auth가 설정되지 않았습니다");
        await confirmPasswordReset(auth, oobCode, newPassword);
      },
    }),
    [],
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!auth?.currentUser) throw new Error("로그인이 필요합니다");
    const email = auth.currentUser.email;
    if (!email) throw new Error("이메일 계정만 비밀번호를 변경할 수 있습니다");

    const credential = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    if (!auth?.currentUser) throw new Error("로그인이 필요합니다");
    auth.languageCode = "ko";
    await sendEmailVerification(auth.currentUser);
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    if (!auth?.currentUser) throw new Error("로그인이 필요합니다");
    const email = auth.currentUser.email;
    if (!email) throw new Error("이메일 계정만 탈퇴할 수 있습니다");

    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);

    const uid = auth.currentUser.uid;
    await deleteUserFirestoreData(uid);
    clearUserLocalData();
    await deleteUser(auth.currentUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoaded,
      isSignedIn: Boolean(user),
      signInWithEmail,
      signUpWithEmail,
      requestPasswordReset: requestPasswordResetFn,
      completePasswordReset,
      changePassword,
      sendVerificationEmail,
      signOut,
      deleteAccount,
    }),
    [user, isLoaded, signInWithEmail, signUpWithEmail, requestPasswordResetFn, completePasswordReset, changePassword, sendVerificationEmail, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      isLoaded: true,
      isSignedIn: false,
      signInWithEmail: async () => {},
      signUpWithEmail: async () => {},
      requestPasswordReset: async () => ({ emailed: false }),
      completePasswordReset: {
        verifyCode: async () => "",
        apply: async () => {},
      },
      changePassword: async () => {},
      sendVerificationEmail: async () => {},
      signOut: async () => {},
      deleteAccount: async () => {},
    };
  }
  return ctx;
}

export { isFirebaseConfigured };
