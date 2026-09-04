"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "uzushio-a2hs-dismissed";

// iPhone/iPad のブラウザで開いている人にだけ、
// 「ホーム画面に追加すると全画面で使える」ことを1度だけ知らせる。
//
// なぜ出すのか
// ------------
// iPhoneのSafariは画面の上下にアドレスバーとツールバーを必ず出す。
// iPhone SE（縦667px）だと、この2本だけで100px以上が消えるうえ、
// アプリのタブがSafariのボタンのすぐ上に並ぶので押し間違えやすい。
// ホーム画面に追加して開けば、そのバーが消えて全画面になる。
export default function AddToHomeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // すでに「ホーム画面から」開いている＝案内は不要
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOSのSafariだけが持つ独自の判定。型に無いので any 経由で読む
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // iOS（iPhone / iPad）かどうか。iPadOSはUAがMacと同じになるので、
    // 「タッチできるMac」も iPad とみなす。
    const ua = window.navigator.userAgent;
    const isIOS =
      /iPhone|iPad|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!isIOS) return;

    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // プライベートブラウズなどで読めないことがある。その場合は出す。
    }
    // 開いた直後はオープニング演出が出ているので、少し待ってから出す。
    // （effectの中でそのままsetStateすると再描画が連鎖するため、という理由もある）
    const timer = setTimeout(() => setShow(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 保存できなくても動作に影響はない
    }
  };

  return (
    <div
      className="fixed inset-x-0 z-[60] px-3"
      style={{
        bottom: "calc(var(--nav-h) + 0.5rem)",
      }}
    >
      <div className="animate-fade-in-up mx-auto flex max-w-md items-start gap-2 rounded-2xl border-2 border-kosei-700 bg-white/97 p-3 shadow-[0_3px_0_var(--color-kosei-700)] backdrop-blur">
        <div className="flex-1 text-[11px] font-bold leading-snug text-kosei-800">
          下の
          <span className="mx-0.5 font-black">共有（□に↑）</span>
          →「ホーム画面に追加」で
          <br />
          バーが消えて全画面で使えます。
        </div>
        <button
          onClick={close}
          aria-label="閉じる"
          className="shrink-0 rounded-full bg-kosei-100 px-2.5 py-1 font-bold text-kosei-700"
          style={{ fontSize: "clamp(0.625rem, 2.9vw, 0.75rem)" }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
