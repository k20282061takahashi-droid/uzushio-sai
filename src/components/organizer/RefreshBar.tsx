"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 画面右上に出す「最終更新時刻」と「更新」ボタン。
//
// 企画の状況や連絡などのほとんどのデータは、変わった瞬間に自動で画面へ届く
// 仕組み（リアルタイム購読）になっている。ただし本当に届いているのか
// 見た目では分からないので、最後にデータが届いた時刻を出している。
// 「更新」ボタンは、来場者数のように自動で届かないものを数え直すためのもの。

export function formatClock(ms: number | null): string {
  if (!ms) return "--:--:--";
  return new Date(ms).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// データが届くたびに時刻を記録するための道具
export function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mark = useCallback(() => setLastUpdated(Date.now()), []);
  return { lastUpdated, mark };
}

export default function RefreshBar({
  lastUpdated,
  onRefresh,
}: {
  lastUpdated: number | null;
  onRefresh?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  // 「◯秒前」を出すための現在時刻。10秒ごとに取り直す。
  // （表示を作る途中で時計を読むと画面がちらつくため、状態として持っている）
  const [now, setNow] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    timerRef.current = setInterval(update, 10_000);
    return () => {
      clearTimeout(first);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handle() {
    if (!onRefresh) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  const agoText = (() => {
    if (!lastUpdated || !now) return "";
    const sec = Math.floor((now - lastUpdated) / 1000);
    if (sec < 10) return "たった今";
    if (sec < 60) return `${sec}秒前`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分前`;
    return `${Math.floor(min / 60)}時間前`;
  })();

  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="text-right leading-tight">
        <p className="hidden text-[13px] text-slate-400 sm:block">最終更新</p>
        <p className="font-mono text-xs text-slate-300">
          {formatClock(lastUpdated)}
          {agoText && (
            <span className="ml-1 hidden text-slate-400 sm:inline">
              ({agoText})
            </span>
          )}
        </p>
      </div>
      <button
        onClick={handle}
        disabled={busy || !onRefresh}
        className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 active:scale-95 disabled:opacity-50"
      >
        {busy ? "更新中..." : "更新"}
      </button>
    </div>
  );
}
