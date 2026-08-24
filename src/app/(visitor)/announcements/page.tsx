"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Announcement, subscribeVisitorAnnouncements } from "@/lib/booth";
import { truncate } from "@/lib/text";

function formatTime(ms: number | null) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());

  useEffect(() => subscribeVisitorAnnouncements(setAnnouncements), []);

  // ピン留めを先頭にまとめ、その下に残りを新しい順で並べる
  // （subscribeVisitorAnnouncements が既に新しい順で渡してくれる）
  const pinned = announcements.filter((a) => a.pinned);
  const rest = announcements.filter((a) => !a.pinned);

  const toggle = (id: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      {announcements.length === 0 ? (
        <p className="text-sm text-slate-500">現在お知らせはありません</p>
      ) : (
        <div className="space-y-6">
          {/* ピン留めされたお知らせ（常に一番上） */}
          {pinned.length > 0 && (
            <section>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-amber-300">
                <span aria-hidden>📌</span> ピン留めのお知らせ
              </p>
              <ul className="space-y-3">
                {pinned.map((a, i) => (
                  <AnnouncementItem
                    key={a.id}
                    announcement={a}
                    isOpen={openSet.has(a.id)}
                    onToggle={() => toggle(a.id)}
                    delay={80 + i * 40}
                    highlight
                  />
                ))}
              </ul>
            </section>
          )}

          {/* その他のお知らせ（新しい順） */}
          {rest.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <p className="mb-2 text-xs font-bold text-slate-500">
                  これまでのお知らせ
                </p>
              )}
              <ul className="space-y-3">
                {rest.map((a, i) => (
                  <AnnouncementItem
                    key={a.id}
                    announcement={a}
                    isOpen={openSet.has(a.id)}
                    onToggle={() => toggle(a.id)}
                    delay={120 + i * 40}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function AnnouncementItem({
  announcement: a,
  isOpen,
  onToggle,
  delay,
  highlight,
}: {
  announcement: Announcement;
  isOpen: boolean;
  onToggle: () => void;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <li
      className={`animate-fade-in-up rounded-xl border text-sm ${
        highlight
          ? "border-amber-400/30 bg-amber-400/10"
          : "border-white/10 bg-white/5"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <p className="shrink-0 text-xs text-slate-500">
          {formatTime(a.createdAt)}
        </p>
        <p className="flex-1">{isOpen ? a.title : truncate(a.title, 15)}</p>
        <span
          className={`shrink-0 text-xs text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {isOpen && a.body && <p className="px-3 pb-3 text-slate-300">{a.body}</p>}
    </li>
  );
}
