"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateAccessToken } from "./booth";
import { getDeviceId } from "./visits";

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

// ─────────────────────────────────────────────────────────────
// 特別企画の挑戦券（コンプリート報酬）
//
// スタンプを全部集めると、その端末だけの挑戦券が1枚できる。
// 券にはQRコードが付いていて、特別企画のスタッフが読み取ると「使用済み」になる。
// 一度使った券は二度と使えない。
// ─────────────────────────────────────────────────────────────

export type RewardTicket = {
  // 券のID（QRコードに入る文字列）
  code: string;
  deviceId: string;
  used: boolean;
  usedAt: number | null;
};

const TICKET_KEY = "uzushiosai_reward_ticket";

function toTicket(code: string, data: Record<string, unknown>): RewardTicket {
  const usedAt = data.usedAt as { toMillis?: () => number } | undefined;
  return {
    code,
    deviceId: typeof data.deviceId === "string" ? data.deviceId : "",
    used: data.used === true,
    usedAt: usedAt?.toMillis?.() ?? null,
  };
}

// この端末の挑戦券を取り出す。無ければ1枚だけ作る。
// 端末（＝利用者）ごとに1枚しか作られないようにしている。
export async function getOrCreateRewardTicket(): Promise<RewardTicket | null> {
  const deviceId = getDeviceId();
  if (!deviceId) return null;

  // 1) ブラウザに控えてある券番号から探す
  let code: string | null = null;
  try {
    code = window.localStorage.getItem(TICKET_KEY);
  } catch {
    code = null;
  }
  if (code) {
    const snap = await getDoc(doc(db, "rewardTickets", code));
    if (snap.exists()) return toTicket(snap.id, snap.data());
  }

  // 2) 控えが消えていても、同じ端末の券がすでにあればそれを使う
  const existing = await getDocs(
    query(
      collection(db, "rewardTickets"),
      where("deviceId", "==", deviceId),
      limit(1),
    ),
  );
  if (!existing.empty) {
    const found = existing.docs[0];
    try {
      window.localStorage.setItem(TICKET_KEY, found.id);
    } catch {}
    return toTicket(found.id, found.data());
  }

  // 3) どこにも無ければ新しく1枚作る
  const newCode = generateAccessToken(16);
  await setDoc(doc(db, "rewardTickets", newCode), {
    deviceId,
    used: false,
    usedAt: null,
    createdAt: serverTimestamp(),
  });
  try {
    window.localStorage.setItem(TICKET_KEY, newCode);
  } catch {}
  return { code: newCode, deviceId, used: false, usedAt: null };
}

// 券の使用状況をリアルタイムで見張る（スタッフが読み取った瞬間に画面へ反映される）
export function subscribeRewardTicket(
  code: string,
  callback: (ticket: RewardTicket | null) => void,
): () => void {
  return onSnapshot(doc(db, "rewardTickets", code), (snap) => {
    callback(snap.exists() ? toTicket(snap.id, snap.data()) : null);
  });
}

export type RedeemResult =
  | { status: "ok" }
  | { status: "already" ; usedAt: number | null }
  | { status: "notfound" };

// 特別企画のスタッフが券を読み取ったときの処理。
// すでに使われていれば「スキャン済み」を返す。
export async function redeemRewardTicket(code: string): Promise<RedeemResult> {
  const ref = doc(db, "rewardTickets", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { status: "notfound" };

  const ticket = toTicket(snap.id, snap.data());
  if (ticket.used) return { status: "already", usedAt: ticket.usedAt };

  await updateDoc(ref, { used: true, usedAt: serverTimestamp() });
  return { status: "ok" };
}

// QRに入れるURL。スタッフ用ページで読み取る。
export function rewardUrl(origin: string, code: string): string {
  return `${origin}/reward?ticket=${code}`;
}

// QRの中身から券番号を取り出す
export function extractTicketCode(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("ticket");
    if (code) return code;
  } catch {
    // URLでなければそのものを券番号として扱う
  }
  return /^[A-Za-z0-9]{10,40}$/.test(trimmed) ? trimmed : null;
}
