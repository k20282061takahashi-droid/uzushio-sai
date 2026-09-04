"use client";

// 「関係者向けのプレビュー表示」の入り切りを覚えておくしくみ。
//
// 文化祭が始まる前（運営が「文化祭を開始する」を押す前）は、URLを知っている人が
// 来場者アプリの中身を全部見られてしまう。そこで、開始前は「文化祭まであと○日」の
// 画面だけを出すようにした。
//
// ただし、準備している人は本番と同じ画面を確認したい。そこで /test を一度開くと、
// その端末（ブラウザ）だけは開始前でも本番と同じ画面が見られるようにする。
//
// 覚えておく場所にCookieを使う理由:
//   ページを移動しても消えない、ブラウザを閉じても残る、という2つが必要なため。
//   （URLに ?preview=1 を付ける方式だと、タブを押した時点で消えてしまう）

export const PREVIEW_COOKIE = "uzushio_preview";

// 覚えておく期間。30日。文化祭が終わればどのみち関係なくなる。
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// いまプレビュー表示になっているか。ブラウザの中でだけ使える。
export function isPreviewEnabled(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${PREVIEW_COOKIE}=1`);
}

export function enablePreview() {
  document.cookie = `${PREVIEW_COOKIE}=1; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function disablePreview() {
  document.cookie = `${PREVIEW_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
