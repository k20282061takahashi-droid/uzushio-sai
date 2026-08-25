"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Announcement, subscribeVisitorAnnouncements } from "@/lib/booth";
import { PinIcon } from "@/components/Icon";
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
        className="animate-fade-in-up mb-4 inline-block text-sm font-bold text-kosei-700 transition-transform active:scale-95"
      >
        ← ホームへ戻る
      </Link>
      <h1
        className="animate-fade-in-up mb-4 font-heading text-2xl font-black text-kosei-800"
        style={{ animationDelay: "40ms" }}
      >
        お知らせ一覧
      </h1>
      {announcements.length === 0 ? (
        <p className="text-sm text-kosei-600">現在お知らせはありません</p>
      ) : (
        <div className="space-y-6">
          {/* ピン留めされたお知らせ（常に一番上） */}
          {pinned.length > 0 && (
            <section>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-accent-700">
                <PinIcon className="inline h-4 w-4" /> ピン留めのお知らせ
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
                <p className="mb-2 text-xs font-bold text-kosei-600">
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
      className={`pressable animate-fade-in-up rounded-2xl border-2 text-sm ${
        highlight
          ? "border-accent-700 bg-accent-50 shadow-[0_4px_0_var(--color-accent-700)]"
          : "border-kosei-700 bg-white shadow-[0_4px_0_var(--color-kosei-700)]"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <p className="shrink-0 text-xs text-kosei-600">
          {formatTime(a.createdAt)}
        </p>
        <p className={`flex-1 font-bold ${highlight ? "text-accent-700" : "text-kosei-800"}`}>
          {isOpen ? a.title : truncate(a.title, 15)}
        </p>
        <span
          className={`shrink-0 text-xs transition-transform ${highlight ? "text-accent-700" : "text-kosei-600"} ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {isOpen && a.body && (
        <p className="px-3 pb-3 text-kosei-700">{a.body}</p>
      )}
    </li>
  );
}
