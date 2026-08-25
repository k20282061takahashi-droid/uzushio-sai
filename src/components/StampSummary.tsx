"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCollectedIds,
  subscribeStampSpots,
  type StampSpot,
} from "@/lib/stamp";

// ホームに出すスタンプラリーの進み具合。
// 獲得状況はこの端末のブラウザに保存してあるものを読む。
export default function StampSummary() {
  const [spots, setSpots] = useState<StampSpot[]>([]);
  const [collected, setCollected] = useState<string[]>([]);

  useEffect(() => subscribeStampSpots(setSpots), []);
  useEffect(() => {
    const timer = setTimeout(() => setCollected(getCollectedIds()), 0);
    return () => clearTimeout(timer);
  }, []);

  const total = spots.length;
  const got = spots.filter((s) => collected.includes(s.id)).length;
  const progress = total === 0 ? 0 : Math.round((got / total) * 100);

  if (total === 0) return null;

  return (
    <section
      className="animate-fade-in-up mb-8 rounded-3xl border-2 border-kosei-700 bg-white p-4 shadow-[0_5px_0_var(--color-kosei-700)]"
      style={{ animationDelay: "200ms" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-heading text-sm font-bold text-kosei-800">
          スタンプラリー
        </p>
        <p className="text-xs font-bold text-kosei-700">
          {got} / {total} 個
        </p>
      </div>

      <div className="mb-3 h-3 w-full overflow-hidden rounded-full border-2 border-kosei-700 bg-kosei-100">
        <div
          className="h-full bg-gradient-to-r from-kosei-400 to-accent-400 transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Link
        href="/stamp"
        className="pressable mb-3 block w-full rounded-full border-2 border-kosei-800 bg-kosei-600 py-3 text-center font-heading text-sm font-black text-white shadow-[0_4px_0_var(--color-kosei-800)]"
      >
        QRコードをスキャン
      </Link>

      <div className="grid grid-cols-5 gap-2">
        {spots.map((spot) => (
          <div
            key={spot.id}
            className={`flex aspect-square items-center justify-center text-sm ${
              collected.includes(spot.id)
                ? "rounded-full border-2 border-kosei-800 bg-kosei-500 shadow-[0_3px_0_var(--color-kosei-800)]"
                : "rounded-full border-2 border-dashed border-kosei-300 bg-kosei-50 opacity-70"
            }`}
          >
            {collected.includes(spot.id) ? "🎫" : ""}
          </div>
        ))}
      </div>
    </section>
  );
}
