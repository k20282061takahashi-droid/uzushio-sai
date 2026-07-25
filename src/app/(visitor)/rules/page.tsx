"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VisitorRule, subscribeVisitorRules } from "@/lib/booth";

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export default function RulesPage() {
  const [rules, setRules] = useState<VisitorRule[]>([]);
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());

  useEffect(() => subscribeVisitorRules(setRules), []);

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
        来場者の皆さんへ
      </h1>
      <ul className="space-y-3">
        {rules.map((rule, i) => {
          const isOpen = openSet.has(rule.id);
          return (
            <li
              key={rule.id}
              className="animate-fade-in-up rounded-xl border border-white/10 bg-white/5 text-sm"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <button
                onClick={() => toggle(rule.id)}
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
