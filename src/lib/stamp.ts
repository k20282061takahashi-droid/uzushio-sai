"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateAccessToken } from "./booth";

// スタンプラリーの1つ分（設置場所）。
// code は QR に埋め込む合言葉。URLの ?code= に入る。
export type StampSpot = {
  id: string;
  name: string;
  hint: string;
  code: string;
  order: number;
};

export function subscribeStampSpots(
  callback: (spots: StampSpot[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "stampSpots"), orderBy("order", "asc")),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: typeof data.name === "string" ? data.name : "",
            hint: typeof data.hint === "string" ? data.hint : "",
            code: typeof data.code === "string" ? data.code : "",
            order: typeof data.order === "number" ? data.order : 0,
          };
        }),
      );
    },
  );
}

export async function createStampSpot(input: {
  name: string;
  hint: string;
  order: number;
}) {
  await addDoc(collection(db, "stampSpots"), {
    name: input.name,
    hint: input.hint,
    // 合言葉は自動発行。推測されないよう長めにする
    code: generateAccessToken(12),
    order: input.order,
    createdAt: serverTimestamp(),
  });
}

export async function updateStampSpot(
  id: string,
  fields: Partial<Pick<StampSpot, "name" | "hint" | "order">>,
) {
  await updateDoc(doc(db, "stampSpots", id), fields);
}

export async function deleteStampSpot(id: string) {
  await deleteDoc(doc(db, "stampSpots", id));
}

// QRに入れるURL。スマホの標準カメラで読んでもアプリが開いてスタンプが押される。
export function stampUrl(origin: string, code: string): string {
  return `${origin}/stamp?code=${code}`;
}

// ─────────────────────────────────────────────
// 集めたスタンプは、この端末のブラウザに保存する。
// ログイン不要にするため、サーバーには送らない。
// ─────────────────────────────────────────────
const STORAGE_KEY = "uzushiosai_stamps";

export function getCollectedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function addCollectedId(id: string): string[] {
  const next = Array.from(new Set([...getCollectedIds(), id]));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できない設定（プライベートモードなど）でも画面は動かす
  }
  return next;
}

// QRの中身（URL でも合言葉だけでも受け付ける）から合言葉を取り出す
export function extractCode(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code");
    if (code) return code;
  } catch {
    // URLでなければ、そのものを合言葉として扱う
  }
  return /^[A-Za-z0-9]{6,32}$/.test(trimmed) ? trimmed : null;
}
