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
        className="animate-fade-in-up mb-4 inline-block text-sm font-bold text-kosei-700 transition-transform active:scale-95"
      >
        ← ホームへ戻る
      </Link>
      <h1
        className="animate-fade-in-up mb-4 font-heading text-2xl font-black text-kosei-800"
        style={{ animationDelay: "40ms" }}
      >
        落とし物
      </h1>

      {unclaimed.length === 0 ? (
        <p
          className="animate-fade-in-up text-sm text-kosei-600"
          style={{ animationDelay: "80ms" }}
        >
          現在届いている落とし物はありません
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {unclaimed.map((item, i) => (
            <div
              key={item.id}
              className="pressable animate-fade-in-up overflow-hidden rounded-2xl border-2 border-kosei-700 bg-white shadow-[0_4px_0_var(--color-kosei-700)]"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <div className="p-3">
                <p className="text-sm font-bold text-kosei-800">
                  {item.description || "（内容未登録）"}
                </p>
                <p className="mt-1 text-sm text-kosei-600">
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
