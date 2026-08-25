"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "@/components/QrScanner";
import StampGetEffect from "@/components/StampGetEffect";
import {
  addCollectedId,
  extractCode,
  getCollectedIds,
  getOrCreateRewardTicket,
  subscribeRewardTicket,
  subscribeStampSpots,
  type RewardTicket,
  type StampSpot,
} from "@/lib/stamp";

export default function StampPage() {
  const [spots, setSpots] = useState<StampSpot[]>([]);
  const [collected, setCollected] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  // 画面に出す一言（エラーや「すでに獲得済み」など）
  const [message, setMessage] = useState<string | null>(null);
  // スタンプを取った瞬間の演出に出す場所の名前
  const [getEffect, setGetEffect] = useState<string | null>(null);
  const [ticket, setTicket] = useState<RewardTicket | null>(null);
  const router = useRouter();
  // コンプリート画面へ飛ばすのは1回だけ
  const jumped = useRef(false);
  // 「この画面でスタンプを取った」ことの記録（開き直しただけでは飛ばさない）
  const justCompleted = useRef(false);

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
      justCompleted.current = true;
      setGetEffect(spot.name);
      navigator.vibrate?.([60, 40, 120]);
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
  const complete = total > 0 && got === total;

  // 全部そろったら挑戦券を用意して、その状態を見張る
  useEffect(() => {
    if (!complete) return;
    let unsubscribe: (() => void) | null = null;
    const timer = setTimeout(async () => {
      const t = await getOrCreateRewardTicket();
      setTicket(t);
      if (t) unsubscribe = subscribeRewardTicket(t.code, setTicket);
    }, 0);
    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [complete]);

  // 最後の1個を取った直後は、演出が終わったらお祝いの画面へ移動する
  useEffect(() => {
    if (!complete || getEffect !== null || jumped.current) return;
    if (!justCompleted.current) return;
    jumped.current = true;
    const timer = setTimeout(() => router.push("/stamp/complete"), 200);
    return () => clearTimeout(timer);
  }, [complete, getEffect, router]);

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-8">
      <h1 className="animate-fade-in-up mb-4 font-heading text-2xl font-black text-kosei-800">
        スタンプラリー
      </h1>

      {total === 0 ? (
        <p className="text-sm text-kosei-600">
          スタンプラリーはまだ準備中です。
        </p>
      ) : (
        <>
          <div
            className="animate-fade-in-up mb-2 flex items-center justify-between text-sm"
            style={{ animationDelay: "20ms" }}
          >
            <p className="font-bold text-kosei-600">
              {got} / {total} 個 獲得
            </p>
            <p className="font-bold text-kosei-600">{progress}%</p>
          </div>
          <div
            className="animate-fade-in-up mb-6 h-3 w-full overflow-hidden rounded-full border-2 border-kosei-700 bg-kosei-100"
            style={{ animationDelay: "40ms" }}
          >
            <div
              className="h-full bg-gradient-to-r from-kosei-400 to-accent-400 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {complete && (
            <Link
              href="/stamp/complete"
              className="pressable animate-fade-in-up mb-6 block rounded-2xl border-2 border-warn-800 bg-warn-50 p-3 text-center font-heading text-sm font-black text-warn-800 shadow-[0_4px_0_var(--color-warn-800)]"
            >
              {ticket?.used
                ? "✅ 特別企画に参加しました"
                : "🎉 コンプリート！特別企画の挑戦券を見る"}
            </Link>
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
                    className={`flex aspect-square w-full items-center justify-center rounded-full border-2 text-lg transition-transform duration-300 ${
                      isCollected
                        ? "scale-100 border-kosei-800 bg-kosei-500 shadow-[0_3px_0_var(--color-kosei-800)]"
                        : "scale-90 border-dashed border-kosei-300 bg-kosei-50 opacity-70"
                    }`}
                  >
                    {isCollected ? (ticket?.used ? "✅" : "🎫") : ""}
                  </div>
                  <span className="text-center text-[9px] font-bold leading-tight text-kosei-500">
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
        className="pressable animate-fade-in-up w-full rounded-full border-2 border-kosei-800 bg-kosei-600 py-4 text-center font-heading text-lg font-black text-white shadow-[0_4px_0_var(--color-kosei-800)]"
        style={{ animationDelay: "120ms" }}
      >
        {scanning ? "スキャンを停止" : "QRコードをスキャン"}
      </button>

      {scanning && <QrScanner onDetected={onDetected} />}

      {getEffect !== null && (
        <StampGetEffect
          spotName={getEffect}
          onDone={() => setGetEffect(null)}
        />
      )}

      {message && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border-2 border-kosei-700 bg-white p-4 text-center font-heading text-base font-black text-kosei-800 shadow-[0_5px_0_var(--color-kosei-700)]">
          {message}
        </div>
      )}
    </div>
  );
}
