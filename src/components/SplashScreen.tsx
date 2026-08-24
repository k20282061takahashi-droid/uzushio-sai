"use client";

import { useEffect, useState } from "react";

// アプリを開いた最初に出るオープニング演出。
// 渦（うずしお）が回りながら描かれ、タイトルが浮かび上がって、そのまま消える。
// この間にアプリ本体の読み込みが進む。
//
// アプリ内のページ移動では再生されない（画面の枠組みごと残るため）。
// 再生されるのはアプリを開いたときと、ページを再読み込みしたときだけ。

const HOLD_MS = 1900; // 演出を見せる時間
const FADE_MS = 550; // 消えるまでの時間

export default function SplashScreen() {
  const [phase, setPhase] = useState<"showing" | "fading" | "done">("showing");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fading"), HOLD_MS);
    const doneTimer = setTimeout(() => setPhase("done"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 transition-opacity ease-out"
      style={{
        opacity: phase === "fading" ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center">
        {/* 渦のアニメーション */}
        <svg
          viewBox="0 0 200 200"
          className="h-40 w-40"
          style={{
            animation: "splash-spin 2.4s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <defs>
            <linearGradient id="splashStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* 外側から内側へ巻き込んでいく渦の線を3本ずらして描く */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d="M100 12
                 A 88 88 0 1 1 12 100
                 A 72 72 0 1 0 100 28
                 A 56 56 0 1 1 156 100
                 A 40 40 0 1 0 100 60
                 A 24 24 0 1 1 124 100"
              fill="none"
              stroke="url(#splashStroke)"
              strokeWidth={3.5 - i}
              strokeLinecap="round"
              opacity={0.9 - i * 0.28}
              transform={`rotate(${i * 40} 100 100)`}
              style={{
                strokeDasharray: 900,
                strokeDashoffset: 900,
                animation: `splash-draw 1.8s cubic-bezier(0.33, 1, 0.68, 1) ${i * 0.14}s both`,
              }}
            />
          ))}
        </svg>

        <div
          className="mt-2 text-center"
          style={{
            animation:
              "splash-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.75s both",
          }}
        >
          <p className="text-xs tracking-[0.4em] text-slate-500">2026</p>
          <h1 className="mt-1 text-4xl font-bold tracking-[0.15em] text-white">
            渦潮祭
          </h1>
        </div>
      </div>
    </div>
  );
}
