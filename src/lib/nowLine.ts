"use client";

import { useEffect, useState } from "react";

// タイムテーブルに「今この時刻」の赤い線を引くための共通処理。
// 運営画面と来場者アプリの両方から使う。

// 日本時間での「今」を、0時からの分数で返す。
// 端末の時計が海外に設定されていてもずれないようにしている。
export function nowMinutesInJapan(): number {
  const text = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
}

// 今の時刻（分）を1分ごとに更新して返す。
// enabled が false のとき（今日が開催日でないときなど）は null。
export function useNowMinutes(enabled: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(enabled ? nowMinutesInJapan() : null);
    // レンダーの直後に1回、そのあとは1分ごとに更新する
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [enabled]);

  return now;
}
