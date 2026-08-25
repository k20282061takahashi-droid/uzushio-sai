"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Announcement, subscribeVisitorAnnouncements } from "@/lib/booth";

// ホームに出すお知らせのバナー。
// ・出すのは最新3件まで（全部は出さない。全部見たい人は一覧ページへ）
// ・ピン留めされたものを先に、そのあと新しい順
// ・1行に収まらない場合は途中で折り返さず「…」で省略する
const MAX_ITEMS = 3;

export default function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => subscribeVisitorAnnouncements(setAnnouncements), []);

  // ピン留め優先で並べ直し、先頭3件だけ使う
  const items = [
    ...announcements.filter((a) => a.pinned),
    ...announcements.filter((a) => !a.pinned),
  ].slice(0, MAX_ITEMS);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <Link
      href="/announcements"
      className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/20 bg-white/5 px-4 py-3 transition-transform active:scale-95"
    >
      <span className="shrink-0 rounded-full border border-white/30 px-2 py-1 text-xs font-bold text-white">
        お知らせ
      </span>
      <span className="relative h-6 min-w-0 flex-1 overflow-hidden">
        {items.map((a, i) => (
          <span
            key={a.id}
            className="absolute inset-0 flex items-center transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateY(${(i - (index % items.length)) * 100}%)`,
            }}
          >
            {a.pinned && <span className="mr-1 shrink-0">📌</span>}
            <span className="truncate text-sm font-bold">{a.title}</span>
          </span>
        ))}
      </span>
      {items.length > 1 && (
        <span className="flex shrink-0 gap-1">
          {items.map((a, i) => (
            <span
              key={a.id}
              className={
                i === index % items.length
                  ? "h-1.5 w-1.5 rounded-full bg-white"
                  : "h-1.5 w-1.5 rounded-full bg-white/25"
              }
            />
          ))}
        </span>
      )}
    </Link>
  );
}
