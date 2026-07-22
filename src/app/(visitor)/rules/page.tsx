"use client";

import Link from "next/link";
import { useState } from "react";

const rules = [
  { heading: "飲食について", text: "校舎内での飲食は指定された企画内のみでお願いします" },
  { heading: "上履き・外靴について", text: "上履き・外靴の指定エリアを守ってください" },
  { heading: "撮影・SNS投稿について", text: "撮影した写真・動画のSNS投稿は許可された範囲でお願いします" },
  { heading: "体調不良時の対応", text: "体調が悪くなった場合はすぐに近くのスタッフへお声がけください" },
];

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export default function RulesPage() {
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
        来場者の皆さんへ
      </h1>
      <ul className="space-y-3">
        {rules.map((rule, i) => {
          const isOpen = openSet.has(i);
          return (
            <li
              key={rule.heading}
              className="animate-fade-in-up rounded-xl border border-white/10 bg-white/5 text-sm"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <button
                onClick={() => toggle(i)}
                className="flex w-full flex-col gap-1 p-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">{rule.heading}</p>
                  <span
                    className={`shrink-0 text-xs text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </div>
                <p className="text-slate-300">
                  {isOpen ? rule.text : truncate(rule.text, 15)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
