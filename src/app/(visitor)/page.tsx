"use client";

import Link from "next/link";
import { useState } from "react";

const areas = [
  { id: "gym", name: "体育館", congested: true },
  { id: "senior", name: "高校棟", congested: true },
  { id: "junior", name: "中学棟", congested: false },
  { id: "schoolyard", name: "校庭", congested: false },
];

const nextEvent = {
  now: "〜9:50",
  next: "10:00〜10:50",
  title: "吹奏楽部 演奏会",
  venue: "体育館",
};

export default function VisitorHome() {
  const [pressedArea, setPressedArea] = useState<string | null>(null);
  const congestedAreas = areas.filter((a) => a.congested).map((a) => a.name);

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <header className="animate-fade-in-up mb-6 text-center">
        <p className="text-sm tracking-widest text-sky-300">2026</p>
        <h1 className="text-3xl font-bold tracking-wide">渦潮祭</h1>
      </header>

      {/* エリア選択 */}
      <section
        className="animate-fade-in-up mb-6 grid grid-cols-2 gap-3"
        style={{ animationDelay: "60ms" }}
      >
        {areas.map((area) => (
          <Link
            key={area.id}
            href={`/map?area=${area.id}`}
            onPointerDown={() => setPressedArea(area.id)}
            onPointerUp={() => setPressedArea(null)}
            onPointerLeave={() => setPressedArea(null)}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/60 to-slate-800/60 p-4 text-left transition-transform duration-150 ease-out active:scale-95 ${
              pressedArea === area.id ? "scale-95" : ""
            }`}
          >
            <p className="text-lg font-bold">{area.name}</p>
            {area.congested && (
              <span className="mt-1 inline-block rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">
                混雑中
              </span>
            )}
          </Link>
        ))}
      </section>

      <p
        className="animate-fade-in-up mb-6 text-center text-xs text-slate-400"
        style={{ animationDelay: "100ms" }}
      >
        現在の混雑場所：{congestedAreas.join("、") || "なし"}
      </p>

      {/* 次のイベント */}
      <section
        className="animate-fade-in-up mb-6 rounded-2xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "140ms" }}
      >
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>イベント ＠{nextEvent.venue}</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
            Now {nextEvent.now}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{nextEvent.title}</p>
            <p className="text-xs text-slate-400">next {nextEvent.next}</p>
          </div>
          <Link
            href="/timeline"
            className="rounded-full bg-sky-500/20 px-3 py-1.5 text-sm text-sky-300 transition-transform active:scale-90"
          >
            時間割 →
          </Link>
        </div>
      </section>

      {/* クイックリンク */}
      <section
        className="animate-fade-in-up mb-6 grid grid-cols-2 gap-3"
        style={{ animationDelay: "180ms" }}
      >
        <Link
          href="/lost-items"
          className="rounded-xl bg-white/5 p-4 text-center transition-transform active:scale-95"
        >
          <p className="text-2xl">🔍</p>
          <p className="mt-1 text-sm font-bold">落とし物</p>
        </Link>
        <Link
          href="/announcements"
          className="rounded-xl bg-white/5 p-4 text-center transition-transform active:scale-95"
        >
          <p className="text-2xl">📣</p>
          <p className="mt-1 text-sm font-bold">来場者の皆さんへ</p>
        </Link>
      </section>

      {/* スタンプラリー進捗 */}
      <section
        className="animate-fade-in-up mb-8 rounded-2xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "220ms" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold">スタンプラリー</p>
          <p className="text-xs text-slate-400">あと4個</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300 transition-[width] duration-500"
            style={{ width: "40%" }}
          />
        </div>
        <Link
          href="/stamp"
          className="mt-3 inline-block w-full rounded-xl bg-sky-500/20 py-2.5 text-center text-sm font-bold text-sky-300 transition-transform active:scale-95"
        >
          QRコードをスキャン
        </Link>
      </section>
    </div>
  );
}
