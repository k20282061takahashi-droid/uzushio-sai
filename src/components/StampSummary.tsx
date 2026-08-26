"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCollectedIds,
  hintSizeClass,
  subscribeStampSpots,
  type StampSpot,
} from "@/lib/stamp";
import { StampIcon } from "./Icon";

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
      className="animate-fade-in-up relative mb-8 rounded-[28px] border-2 border-kosei-700 bg-white p-4 pt-7 shadow-[0_5px_0_var(--color-kosei-700)]"
      style={{ animationDelay: "200ms" }}
    >
      {/* 台紙のタブ（スタンプ本体ページと共通の見た目） */}
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-kosei-700 bg-kosei-600 px-3.5 py-0.5 font-heading text-[11px] font-black tracking-wide text-white shadow-[0_2px_0_var(--color-kosei-800)]">
        STAMP CARD
      </span>

      <div className="mb-2 flex items-center justify-between">
        <p className="font-heading text-base font-bold text-kosei-800">
          スタンプラリー
        </p>
        <p className="text-sm font-bold text-kosei-700">
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
        href="/stamp?scan=1"
        className="pressable mb-3 block w-full rounded-full border-2 border-kosei-800 bg-kosei-600 py-3 text-center font-heading text-base font-black text-white shadow-[0_4px_0_var(--color-kosei-800)]"
      >
        QRコードをスキャン
      </Link>

      <div className="grid grid-cols-5 gap-2">
        {spots.map((spot) => {
          const isCollected = collected.includes(spot.id);
          return (
            <div
              key={spot.id}
              className={`flex aspect-square items-center justify-center p-1 ${
                isCollected
                  ? "rounded-full border-2 border-kosei-800 bg-kosei-500 shadow-[0_3px_0_var(--color-kosei-800)]"
                  : "rounded-full border-2 border-dashed border-kosei-300 bg-kosei-50"
              }`}
            >
              {isCollected ? (
                <StampIcon className="h-5 w-5 text-white" />
              ) : (
                <span
                  className={`text-center font-bold leading-none text-kosei-400 ${hintSizeClass(
                    spot.hint,
                    true,
                  )}`}
                >
                  {spot.hint}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
