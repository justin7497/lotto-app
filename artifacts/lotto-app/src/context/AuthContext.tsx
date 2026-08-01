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
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  notifySavedSetsInvalidate,
  setSavedNumbersUserIdGetter,
} from "@/utils/savedNumbers";
import {
  notifyFavoritePicksInvalidate,
  setFavoritePicksUserIdGetter,
} from "@/utils/favoriteNumbers";
import { clearUserLocalData, deleteUserFirestoreData } from "@/utils/accountDeletion";

interface AuthContextValue {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
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
    await createUserWithEmailAndPassword(auth, email.trim(), password);
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
      signOut,
      deleteAccount,
    }),
    [user, isLoaded, signInWithEmail, signUpWithEmail, signOut, deleteAccount],
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
      signOut: async () => {},
      deleteAccount: async () => {},
    };
  }
  return ctx;
}

export { isFirebaseConfigured };
