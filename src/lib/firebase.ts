import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // 利用者数の計測（Firebase Analytics）に必要
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 学校の制限されたWi-Fi等、ストリーミング接続を塞ぐネットワークでも
// 確実に繋がるようlong pollingを強制する
export const db = (() => {
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
})();

export const storage = getStorage(app);

// ------------------------------------------------------------------
// Firebase Analytics（利用者数の計測）
//
// ブラウザの中でしか動かないので、サーバー側では何もしない。
// 端末（ブラウザ）ごとにIDが1つ発行され、それを元に人数が数えられるため、
// 同じ端末でアプリを開き直しても1人としてカウントされる。
// ------------------------------------------------------------------
let analyticsInstance: Analytics | null = null;

export async function initAnalytics(): Promise<Analytics | null> {
  // サーバー側（ビルド時・SSR時）では動かさない
  if (typeof window === "undefined") return null;
  // 一度作ったら使い回す
  if (analyticsInstance) return analyticsInstance;
  // measurementId が未設定なら計測しない（ローカル開発時など）
  if (!firebaseConfig.measurementId) return null;

  try {
    // Cookieが無効なブラウザなど、使えない環境では false が返る
    if (!(await isSupported())) return null;
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch {
    // 計測が失敗してもアプリ本体は動き続けてほしいので、握りつぶす
    return null;
  }
}
