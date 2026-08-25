"use client";

import { useEffect } from "react";
import Confetti from "./Confetti";

// スタンプを取った瞬間に、その画面のまま重ねて出す演出。
// 左右から紙吹雪が「バーン」と出て、真ん中にスタンプが押される。
export default function StampGetEffect({
  spotName,
  onDone,
}: {
  spotName: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-kosei-800/40 backdrop-blur-[2px]"
      onClick={onDone}
    >
      <Confetti mode="sides" />

      <div className="relative flex items-center justify-center">
        {/* 押した衝撃の輪 */}
        <span className="animate-stamp-shock absolute h-44 w-44 rounded-full border-4 border-accent-400" />

        {/* スタンプ本体 */}
        <div className="animate-stamp-press flex h-44 w-44 items-center justify-center rounded-full border-[6px] border-accent-700 bg-white/95 shadow-[0_6px_0_var(--color-accent-700)]">
          <p className="text-center font-heading text-2xl font-black leading-tight text-accent-700">
            スタンプ
            <br />
            GET！
          </p>
        </div>
      </div>

      {spotName && (
        <p className="animate-fade-in-up mt-6 rounded-full bg-white px-5 py-2 font-heading text-base font-bold text-kosei-800 shadow-[0_3px_0_var(--color-kosei-700)]">
          {spotName}
        </p>
      )}
    </div>
  );
}
