"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const announcements = [
  "体育館の演奏会は開始5分前に受付終了します",
  "3年C組の企画は待ち時間が長くなっています",
  "本部で温かいお茶を配布しています",
];

export default function AnnouncementTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % announcements.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <Link
      href="/announcements"
      className="flex h-9 items-center gap-2 overflow-hidden rounded-full border border-white/20 bg-white/5 px-3 text-xs transition-transform active:scale-95"
    >
      <span className="shrink-0 rounded-full border border-white/30 px-2 py-0.5 font-bold text-white">
        お知らせ
      </span>
      <span className="relative h-4 flex-1 overflow-hidden">
        {announcements.map((text, i) => (
          <span
            key={text}
            className="absolute inset-0 flex items-center truncate transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateY(${(i - index) * 100}%)`,
            }}
          >
            {text}
          </span>
        ))}
      </span>
    </Link>
  );
}
