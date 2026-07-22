"use client";

import { useState } from "react";

const total = 10;
const collected = 6;

export default function StampPage() {
  const [scanning, setScanning] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">
        スタンプラリー
      </h1>

      <p className="animate-fade-in-up mb-4 text-sm text-slate-400" style={{ animationDelay: "40ms" }}>
        {collected} / {total} 個 獲得
      </p>

      <div
        className="animate-fade-in-up mb-6 grid grid-cols-5 gap-3"
        style={{ animationDelay: "80ms" }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-full border text-lg transition-transform duration-300 ${
              i < collected
                ? "border-amber-300/60 bg-amber-400/20 scale-100"
                : "border-white/10 bg-white/5 scale-90 opacity-50"
            }`}
          >
            {i < collected ? "🎫" : ""}
          </div>
        ))}
      </div>

      <button
        onClick={() => setScanning((s) => !s)}
        className={`animate-fade-in-up w-full rounded-2xl py-4 text-center text-lg font-bold transition-all active:scale-95 ${
          scanning
            ? "bg-red-500/20 text-red-300"
            : "bg-sky-500/20 text-sky-300"
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
