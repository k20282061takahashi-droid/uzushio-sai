"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Announcement, subscribeVisitorAnnouncements } from "@/lib/booth";

export default function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => subscribeVisitorAnnouncements(setAnnouncements), []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % announcements.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (announcements.length === 0) return null;

  return (
    <Link
      href="/announcements"
      className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/20 bg-white/5 px-4 py-3 transition-transform active:scale-95"
    >
      <span className="shrink-0 rounded-full border border-white/30 px-2 py-1 text-xs font-bold text-white">
        お知らせ
      </span>
      <span className="relative h-11 flex-1 overflow-hidden">
        {announcements.map((a, i) => (
          <span
            key={a.id}
            className="absolute inset-0 flex items-center text-sm font-bold leading-tight transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateY(${(i - (index % announcements.length)) * 100}%)`,
            }}
          >
            {a.title}
          </span>
        ))}
      </span>
    </Link>
  );
}
