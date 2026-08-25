"use client";

import { useCallback, useEffect, useState } from "react";
import QrScanner from "@/components/QrScanner";
import {
  addCollectedId,
  extractCode,
  getCollectedIds,
  subscribeStampSpots,
  type StampSpot,
} from "@/lib/stamp";

export default function StampPage() {
  const [spots, setSpots] = useState<StampSpot[]>([]);
  const [collected, setCollected] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  // 画面に出す一言（「スタンプGET！」など）
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeStampSpots(setSpots), []);
  useEffect(() => {
    // 端末に保存してあるスタンプを読み出す
    const timer = setTimeout(() => setCollected(getCollectedIds()), 0);
    return () => clearTimeout(timer);
  }, []);

  // 合言葉を受け取ってスタンプを押す
  const collect = useCallback(
    (code: string): boolean => {
      const spot = spots.find((s) => s.code === code);
      if (!spot) {
        setMessage("このQRコードは渦潮祭のスタンプではありません");
        return false;
      }
      if (getCollectedIds().includes(spot.id)) {
        setMessage(`「${spot.name}」はすでに獲得しています`);
        return true;
      }
      setCollected(addCollectedId(spot.id));
      setMessage(`スタンプGET！「${spot.name}」`);
      navigator.vibrate?.(200);
      return true;
    },
    [spots],
  );

  // スマホの標準カメラでQRを読むと ?code=... 付きでこのページが開く。
  // その場合もその場でスタンプを押す。
  useEffect(() => {
    if (spots.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    // URLから合言葉を消して、再読み込みで二重に処理されないようにする
    window.history.replaceState(null, "", window.location.pathname);
    const timer = setTimeout(() => collect(code), 0);
    return () => clearTimeout(timer);
  }, [spots, collect]);

  // 数秒でメッセージを消す
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const onDetected = useCallback(
    (text: string) => {
      const code = extractCode(text);
      if (!code) {
        setMessage("QRコードを読み取れませんでした");
        return;
      }
      if (collect(code)) setScanning(false);
    },
    [collect],
  );

  const total = spots.length;
  const got = spots.filter((s) => collected.includes(s.id)).length;
  const progress = total === 0 ? 0 : Math.round((got / total) * 100);

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">
        スタンプラリー
      </h1>

      {total === 0 ? (
        <p className="text-sm text-zinc-400">
          スタンプラリーはまだ準備中です。
        </p>
      ) : (
        <>
          <div
            className="animate-fade-in-up mb-2 flex items-center justify-between text-sm"
            style={{ animationDelay: "20ms" }}
          >
            <p className="text-zinc-400">
              {got} / {total} 個 獲得
            </p>
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

          {got === total && (
            <p className="animate-fade-in-up mb-6 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-center text-sm font-bold text-amber-200">
              コンプリート！おめでとうございます 🎉
            </p>
          )}

          <div
            className="animate-fade-in-up mb-6 grid grid-cols-5 gap-3"
            style={{ animationDelay: "80ms" }}
          >
            {spots.map((spot) => {
              const isCollected = collected.includes(spot.id);
              return (
                <div key={spot.id} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex aspect-square w-full items-center justify-center rounded-full border text-lg transition-transform duration-300 ${
                      isCollected
                        ? "scale-100 border-white/50 bg-white/15"
                        : "scale-90 border-white/10 bg-white/5 opacity-50"
                    }`}
                  >
                    {isCollected ? "🎫" : ""}
                  </div>
                  <span className="text-center text-[9px] leading-tight text-zinc-500">
                    {isCollected ? spot.name : spot.hint}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={() => setScanning((s) => !s)}
        className="animate-fade-in-up w-full rounded-2xl border border-white/30 bg-white/5 py-4 text-center text-lg font-bold text-white transition-all active:scale-95"
        style={{ animationDelay: "120ms" }}
      >
        {scanning ? "スキャンを停止" : "QRコードをスキャン"}
      </button>

      {scanning && <QrScanner onDetected={onDetected} />}

      {message && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-white p-4 text-center text-base font-bold text-slate-900 shadow-xl">
          {message}
        </div>
      )}
    </div>
  );
}
