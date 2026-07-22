"use client";

import { useState } from "react";

const total = 10;
const collected = 6;

// 未取得のスタンプに表示する、うっすらとした場所のヒント
const hints = [
  "", "", "", "", "", "",
  "高校棟 4F",
  "中学棟 4F",
  "校庭",
  "体育館",
];

export default function StampPage() {
  const [scanning, setScanning] = useState(false);
  const progress = Math.round((collected / total) * 100);

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">
        スタンプラリー
      </h1>

      <div className="animate-fade-in-up mb-2 flex items-center justify-between text-sm" style={{ animationDelay: "20ms" }}>
        <p className="text-zinc-400">{collected} / {total} 個 獲得</p>
        <p className="text-zinc-400">{progress}%</p>
      </div>
      <div
        className="animate-fade-in-up mb-6 h-2 w-full overflow-hidden rounded-full border border-white/15 bg-white/5"
        style={{ animationDelay: "40ms" }}
      >
        <div
          className="h-full rounded-full bg-white transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className="animate-fade-in-up mb-6 grid grid-cols-5 gap-3"
        style={{ animationDelay: "80ms" }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const isCollected = i < collected;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`flex aspect-square w-full items-center justify-center rounded-full border text-lg grayscale transition-transform duration-300 ${
                  isCollected
                    ? "border-white/50 bg-white/15 scale-100"
                    : "border-white/10 bg-white/5 scale-90 opacity-50"
                }`}
              >
                {isCollected ? "🎫" : ""}
              </div>
              {!isCollected && hints[i] && (
                <span className="text-center text-[9px] leading-tight text-zinc-600">
                  {hints[i]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setScanning((s) => !s)}
        className={`animate-fade-in-up w-full rounded-2xl border py-4 text-center text-lg font-bold transition-all active:scale-95 ${
          scanning
            ? "border-white/50 bg-white/15 text-white"
            : "border-white/30 bg-white/5 text-white"
        }`}
        style={{ animationDelay: "120ms" }}
      >
        {scanning ? "スキャンを停止" : "QRコードをスキャン"}
      </button>

      {scanning && (
        <div className="animate-fade-in-up mt-4 flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-sm text-slate-500">
          カメラ起動中…（準備中）
        </div>
      )}
    </div>
  );
}
