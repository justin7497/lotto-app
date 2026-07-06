import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

/** lotto-app-ljh 프로젝트 공개 SDK 설정 (클라이언트 노출용) */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA2kU0D3_kANAwtz5hrm-QnwfXQO7gdwxw",
  authDomain: "lotto-app-ljh.firebaseapp.com",
  projectId: "lotto-app-ljh",
  storageBucket: "lotto-app-ljh.firebasestorage.app",
  messagingSenderId: "618940715584",
  appId: "1:618940715584:web:e8f1c3f490f7f5e05045a5",
};

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ||
    DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId:
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ||
    DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket:
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ||
    DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId:
    (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) ||
    DEFAULT_FIREBASE_CONFIG.appId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return app;
}

export const auth = isFirebaseConfigured ? getAuth(getFirebaseApp()) : null;
export const db = isFirebaseConfigured ? getFirestore(getFirebaseApp()) : null;
