"use client";

import { useEffect, useState } from "react";
import OpeningAnimation from "./OpeningAnimation";

// アプリを開いた最初に出るオープニング演出。
// 渦から粒子が集まって「渦潮祭 2026」の文字が浮かび上がる（OpeningAnimation）。
// 演出が終わったら少しフェードアウトしてから消す。この間にアプリ本体の読み込みが進む。
//
// アプリ内のページ移動では再生されない（画面の枠組みごと残るため）。
// 再生されるのはアプリを開いたときと、ページを再読み込みしたときだけ。

const FADE_MS = 450;

export default function OpeningScreen() {
  const [phase, setPhase] = useState<"showing" | "fading" | "done">("showing");
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    // 「動きを減らす」設定の人には、演出を出さずそのままアプリを表示する
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => setSize({ w: window.innerWidth, h: window.innerHeight }),
      0,
    );
    return () => clearTimeout(timer);
  }, []);

  if (phase === "done") return null;

  const handleComplete = () => {
    setPhase("fading");
    setTimeout(() => setPhase("done"), FADE_MS);
  };

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#C9EAF3] transition-opacity ease-out"
      style={{
        opacity: phase === "fading" ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      {size && (
        <OpeningAnimation
          width={size.w}
          height={size.h}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
