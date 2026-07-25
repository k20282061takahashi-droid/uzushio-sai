"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LostItemRecord, subscribeLostItems } from "@/lib/booth";

export default function LostItemsPage() {
  const [items, setItems] = useState<LostItemRecord[]>([]);

  useEffect(() => subscribeLostItems(setItems), []);

  const unclaimed = items.filter((i) => i.status === "unclaimed");

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
        落とし物
      </h1>

      {unclaimed.length === 0 ? (
        <p
          className="animate-fade-in-up text-sm text-slate-500"
          style={{ animationDelay: "80ms" }}
        >
          現在届いている落とし物はありません
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {unclaimed.map((item, i) => (
            <div
              key={item.id}
              className="animate-fade-in-up overflow-hidden rounded-xl border border-white/10 bg-white/5"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photoUrl}
                  alt={item.description || "落とし物"}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-slate-900 text-xs text-slate-600">
                  画像なし
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-bold">{item.description || "（内容未登録）"}</p>
                <p className="mt-1 text-xs text-slate-400">
                  保管場所: {item.storageLocation || "本部にお問い合わせください"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
