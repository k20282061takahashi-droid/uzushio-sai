// 来場者数（アプリを開いた端末の数）を数えるための処理。
//
// 【なぜFirebase Analyticsを使わないのか】
// Analyticsの集計結果はGoogle側に保管されていて、アプリの中から読み出すには
// 別途サーバーと認証情報が必要なうえ、反映まで時間がかかる。
// 運営画面でリアルタイムに人数を出したいので、自前でFirestoreに記録して数える。
// （Analytics側の計測もそのまま動いているので、詳しい分析はそちらで見られる）
//
// 【二重カウントしない仕組み】
// 端末ごとに1つだけ匿名IDを作ってブラウザに保存し、
// 「日付_端末ID」という決まった名前で記録を1件だけ作る。
// 同じ端末で何度開き直しても同じ記録を上書きするだけなので、1人のまま。

import {
  collection,
  doc,
  getCountFromServer,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const DEVICE_ID_KEY = "uzushiosai_device_id";

// この端末の匿名IDを取り出す（無ければ作る）。
// プライベートモードなど保存できない環境では null を返す。
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// 日本時間での今日の日付（YYYY-MM-DD）。
// サーバーの時計が海外にあっても日付がずれないようにする。
export function todayInJapan(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// 来場を記録する。1端末につき1日1件。
export async function recordVisit(): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;

  const date = todayInJapan();
  try {
    await setDoc(
      doc(db, "visits", `${date}_${deviceId}`),
      { date, deviceId, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // 記録に失敗してもアプリ本体は動き続けてほしいので、何もしない
  }
}

// 指定した日に来た端末の数を数える。
// 全件を読み込まず件数だけを取得するので、人数が増えても負担が増えない。
export async function countVisitsOn(date: string): Promise<number> {
  if (!date) return 0;
  const snapshot = await getCountFromServer(
    query(collection(db, "visits"), where("date", "==", date)),
  );
  return snapshot.data().count;
}
