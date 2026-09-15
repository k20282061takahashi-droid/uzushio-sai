"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// 通信がつながらない・遅いときの案内。
//
// 何をするか
//   1. オフライン対応の仕組み（public/sw.js）をブラウザに登録する
//   2. 保存してあった情報を表示したときに、そのことを画面の上に出す
//
// なぜ必要か
//   保存版をだまって出すと、来場者は古い情報を最新だと思い込んでしまう。
//   「いま出しているのは保存版です」と正直に伝えて、押せば新しく読み直せる
//   ボタンを添えるほうが、結果的に信用される。

// 端末が通信できない状態かどうかを見張る。
// ブラウザが教えてくれる online / offline の合図をそのまま使う。
function useOffline(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => !navigator.onLine,
    // サーバー側で描くときは「つながっている」として扱う
    () => false,
  );
}

export default function OfflineNotice() {
  const offline = useOffline();
  // 通信はつながっているが遅くて、保存版を出した状態。
  // これは public/sw.js からの知らせで分かる。
  const [servedFromCache, setServedFromCache] = useState(false);

  // オフライン対応の仕組みを登録する。
  // ページの読み込みが終わってからにして、最初の表示を遅くしないようにする。
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 登録できなくてもアプリ本体は動くので、そのまま続ける
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  // 「保存版を出した」「通信できた」の知らせを受け取る
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "uzushio:from-cache") setServedFromCache(true);
      if (type === "uzushio:online") setServedFromCache(false);
    };
    const handleOnline = () => setServedFromCache(false);

    navigator.serviceWorker.addEventListener("message", handleMessage);
    window.addEventListener("online", handleOnline);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline && !servedFromCache) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border-2 border-warn-800 bg-warn-50 px-3 py-2 shadow-[0_3px_0_var(--color-warn-800)]">
        <p className="flex-1 text-xs font-bold leading-snug text-warn-800">
          保存した情報を表示しています
          <span className="block font-normal">
            {offline
              ? "通信がつながっていません。最新の内容とちがう場合があります"
              : "電波が弱いようです。最新の内容とちがう場合があります"}
          </span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="pressable shrink-0 rounded-full border-2 border-warn-800 bg-white px-3 py-1.5 font-heading text-xs font-black text-warn-800"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
