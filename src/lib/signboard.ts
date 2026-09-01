// 企画の看板画像を、Firestoreの中に直接しまうための処理。
//
// なぜCloud Storageを使わないか
// ---------------------------------
// Firebaseの無料プラン(Spark)ではCloud Storageが使えず、有料プラン(Blaze)への
// 切り替えとクレジットカードの登録が必要になる。文化祭の準備期間で用意するのが
// 難しいため、画像そのものを文字列(データURL)に変換してFirestoreに保存している。
//
// 重くならないようにしている工夫
// ---------------------------------
// 画像は企画データ(booths)とは別のコレクションに入れている。企画データの中に
// 入れてしまうと、来場者アプリが企画一覧を購読するたびに58枚ぶんを読み込むことに
// なり、当日の混んだ回線では開かなくなる。別にしておけば、企画の詳細を開いた
// ときに1枚だけ読めばよい。
//
// 企画データ側には「画像があるかどうか」だけを hasSignboard として持たせている。

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// 保存する画像の大きさと画質。詳細画面に出す用途なので長辺800pxで十分。
const MAX_EDGE = 800;
const START_QUALITY = 0.7;
// Firestoreの1ドキュメントの上限は1MiB。余裕をみてこの大きさに収める。
const MAX_BYTES = 700 * 1024;

const COLLECTION = "boothSignboards";

// 画像ファイルを、縮小・圧縮したデータURL（"data:image/jpeg;base64,..."）にする。
// 大きすぎる写真でも収まるよう、上限を超えているあいだは画質を落として作り直す。
export async function compressToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を処理できませんでした");
  // 透過画像でも黒くならないよう、下地を白で塗ってから描く
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = START_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  // データURLの長さがおおよそのバイト数になる
  while (dataUrl.length > MAX_BYTES && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_BYTES) {
    throw new Error("画像が大きすぎます。もう少し小さい写真を選んでください");
  }
  return dataUrl;
}

// 看板画像を保存する。保存できたデータURLをそのまま返すので、
// 呼び出した側は選んだ画像をすぐ画面に出せる。
export async function saveSignboard(
  boothId: string,
  file: File,
): Promise<string> {
  const dataUrl = await compressToDataUrl(file);
  await setDoc(doc(db, COLLECTION, boothId), {
    data: dataUrl,
    updatedAt: serverTimestamp(),
  });
  return dataUrl;
}

// 看板画像を読む。無ければ null。
export async function loadSignboard(boothId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, COLLECTION, boothId));
  const data = snap.data()?.data;
  return typeof data === "string" ? data : null;
}

export async function deleteSignboard(boothId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, boothId));
}
