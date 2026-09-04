"use client";

import { useEffect, useState } from "react";

// 文化祭が始まる前に、来場者に見せる画面。
//
// 運営が「文化祭を開始する」を押すまでは、URLを知っている人にも
// 中身（企画一覧・マップ・タイムテーブルなど）は見せない。
// 代わりに「文化祭まであと○日」を大きく出す。

// いまの日付を「2026-09-19」の形で返す（日本時間）。
// 端末の時計が海外時間になっていても、日本の日付で数えるようにする。
function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// 「2026-09-19」までの残り日数。今日なら0、過ぎていたらマイナス。
function daysUntil(target: string, today: string): number | null {
  const t = Date.parse(`${target}T00:00:00+09:00`);
  const n = Date.parse(`${today}T00:00:00+09:00`);
  if (Number.isNaN(t) || Number.isNaN(n)) return null;
  return Math.round((t - n) / 86400000);
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 「2026-09-19」→「9月19日(土)」
function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return day;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const date = parts.find((p) => p.type === "day")?.value ?? "";
  const weekday =
    parts.find((p) => p.type === "weekday")?.value ??
    WEEKDAYS[d.getDay()] ??
    "";
  return `${month}月${date}日(${weekday})`;
}

export default function BeforeFestivalScreen({ days }: { days: string[] }) {
  // 日付が変わったら表示も変わるように、1分ごとに数え直す。
  // （前の晩から画面を開いたままにしていても、朝には正しい日数になる）
  const [today, setToday] = useState(todayInTokyo);
  useEffect(() => {
    const timer = setInterval(() => setToday(todayInTokyo()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const sorted = [...days].sort();
  const first = sorted[0];
  const remaining = first ? daysUntil(first, today) : null;

  return (
    <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in-up w-full max-w-md">
        <p
          className="tracking-[0.3em] text-kosei-600"
          style={{ fontSize: "clamp(0.75rem, 3.4vw, 0.9375rem)" }}
        >
          2026
        </p>
        <h1
          className="font-heading font-black tracking-wide text-kosei-800"
          style={{ fontSize: "clamp(1.75rem, min(11vw, 11svh), 3.25rem)" }}
        >
          渦潮祭
        </h1>

        {/* いちばん大きく出したいところ */}
        <div
          className="rounded-3xl border-2 border-kosei-700 bg-white/90 px-4 shadow-[0_5px_0_var(--color-kosei-700)]"
          style={{
            marginTop: "clamp(1rem, 4svh, 1.75rem)",
            paddingBlock: "clamp(0.875rem, 4.5svh, 2.25rem)",
          }}
        >
          {remaining === null ? (
            <>
              <p
                className="font-heading font-black text-kosei-800"
                style={{ fontSize: "clamp(1.125rem, min(6.5vw, 6.5svh), 1.875rem)" }}
              >
                準備中です
              </p>
              <p
                className="mt-3 font-bold text-kosei-600"
                style={{ fontSize: "clamp(0.75rem, 3.4vw, 0.875rem)" }}
              >
                開催日が決まりしだい、ここに表示します
              </p>
            </>
          ) : remaining > 0 ? (
            <>
              <p
                className="font-heading font-black text-kosei-700"
                style={{ fontSize: "clamp(0.875rem, min(4.4vw, 4.4svh), 1.25rem)" }}
              >
                文化祭まで
              </p>
              <p className="mt-1 flex items-baseline justify-center gap-1 text-kosei-800">
                <span
                  className="font-heading font-black leading-none"
                  style={{ fontSize: "clamp(1.125rem, min(7vw, 7svh), 2.25rem)" }}
                >
                  あと
                </span>
                <span
                  className="font-heading font-black leading-none tabular-nums"
                  style={{ fontSize: "clamp(3.25rem, min(26vw, 26svh), 8rem)" }}
                >
                  {remaining}
                </span>
                <span
                  className="font-heading font-black leading-none"
                  style={{ fontSize: "clamp(1.125rem, min(7vw, 7svh), 2.25rem)" }}
                >
                  日
                </span>
              </p>
            </>
          ) : (
            <p
              className="font-heading font-black text-kosei-800"
              style={{ fontSize: "clamp(1.25rem, min(8vw, 8svh), 2.25rem)" }}
            >
              まもなく開始します
            </p>
          )}
        </div>

        {sorted.length > 0 && (
          <p
            className="font-bold text-kosei-700"
            style={{
              marginTop: "clamp(0.75rem, 2.5svh, 1.25rem)",
              fontSize: "clamp(0.8125rem, 3.8vw, 1rem)",
            }}
          >
            {sorted.map(formatDay).join("・")}
          </p>
        )}

        <p
          className="hide-on-short leading-relaxed text-kosei-600"
          style={{
            marginTop: "clamp(0.875rem, 3svh, 1.5rem)",
            fontSize: "clamp(0.6875rem, 3.2vw, 0.8125rem)",
          }}
        >
          当日になると、この画面が校内マップ・タイムテーブル・
          <br />
          スタンプラリーに切りかわります。
        </p>
      </div>
    </main>
  );
}
