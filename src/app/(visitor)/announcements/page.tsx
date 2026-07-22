"use client";

import Link from "next/link";
import { useState } from "react";

const announcements = [
  { time: "10:12", text: "体育館の演奏会は開始5分前に受付終了します" },
  { time: "9:50", text: "3年C組の企画は待ち時間が長くなっています" },
  { time: "9:30", text: "本部で温かいお茶を配布しています" },
];

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export default function AnnouncementsPage() {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <Link
        href="/"
        className="animate-fade-in-up mb-4 inline-block text-sm text-slate-400 transition-transform active:scale-95"
      >
        ← ホームへ戻る
      </Link>
      <h1
        className="animate-fade-in-up mb-4 text-2xl font-bold"
        style={{ animationDelay: "40ms" }}
      >
        お知らせ一覧
      </h1>
      <ul className="space-y-3">
        {announcements.map((a, i) => {
          const isOpen = openSet.has(i);
          return (
            <li
              key={a.time + a.text}
              className="animate-fade-in-up rounded-xl border border-white/10 bg-white/5 text-sm"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <button
                onClick={() => toggle(i)}
                className="flex w-full items-center gap-2 p-3 text-left"
              >
                <p className="shrink-0 text-xs text-slate-500">{a.time}</p>
                <p className="flex-1">{isOpen ? a.text : truncate(a.text, 15)}</p>
                <span
                  className={`shrink-0 text-xs text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
