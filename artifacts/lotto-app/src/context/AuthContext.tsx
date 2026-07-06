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
  onAuthStateChanged,
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

interface AuthContextValue {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
      setIsLoaded(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoaded(true);
      setSavedNumbersUserIdGetter(nextUser ? () => nextUser.uid : null);

      const nextUid = nextUser?.uid ?? null;
      if (prevUidRef.current !== undefined && prevUidRef.current !== nextUid) {
        qc.clear();
        notifySavedSetsInvalidate();
      }
      prevUidRef.current = nextUid;
    });

    return () => {
      unsubscribe();
      setSavedNumbersUserIdGetter(null);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoaded,
      isSignedIn: Boolean(user),
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [user, isLoaded, signInWithEmail, signUpWithEmail, signOut],
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
    };
  }
  return ctx;
}

export { isFirebaseConfigured };
