"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Announcement, subscribeVisitorAnnouncements } from "@/lib/booth";

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

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
        <ul className="space-y-3">
          {announcements.map((a, i) => {
            const isOpen = openSet.has(a.id);
            return (
              <li
                key={a.id}
                className="animate-fade-in-up rounded-xl border border-white/10 bg-white/5 text-sm"
                style={{ animationDelay: `${80 + i * 40}ms` }}
              >
                <button
                  onClick={() => toggle(a.id)}
                  className="flex w-full items-center gap-2 p-3 text-left"
                >
                  {a.pinned && <span className="shrink-0 text-amber-400">📌</span>}
                  <p className="shrink-0 text-xs text-slate-500">
                    {formatTime(a.createdAt)}
                  </p>
                  <p className="flex-1">{isOpen ? a.title : truncate(a.title, 15)}</p>
                  <span
                    className={`shrink-0 text-xs text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>
                {isOpen && a.body && (
                  <p className="px-3 pb-3 text-slate-300">{a.body}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
