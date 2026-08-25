"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "@/components/QrScanner";
import { extractTicketCode, redeemRewardTicket } from "@/lib/stamp";

// 特別企画のスタッフが使うページ。QRコードを読み取るだけの画面。
// ・読み取れたら「読み込み完了」
// ・すでに使われた券なら「スキャン済みです」
type Result =
  | { kind: "ok" }
  | { kind: "already"; usedAt: number | null }
  | { kind: "notfound" }
  | { kind: "invalid" };

function formatTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RewardScanPage() {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [count, setCount] = useState(0);
  // 同じ券を続けて何度も処理しないための控え
  const busy = useRef(false);

  const onDetected = useCallback(async (text: string) => {
    if (busy.current) return;
    const code = extractTicketCode(text);
    if (!code) {
      setResult({ kind: "invalid" });
      return;
    }
    busy.current = true;
    setChecking(true);
    setScanning(false);
    const res = await redeemRewardTicket(code);
    setChecking(false);
    if (res.status === "ok") {
      setResult({ kind: "ok" });
      setCount((c) => c + 1);
      navigator.vibrate?.(200);
    } else if (res.status === "already") {
      setResult({ kind: "already", usedAt: res.usedAt });
      navigator.vibrate?.([100, 80, 100]);
    } else {
      setResult({ kind: "notfound" });
    }
  }, []);

  // 結果を消して、次の人を読み取れる状態に戻す
  const reset = useCallback(() => {
    setResult(null);
    busy.current = false;
    setScanning(true);
  }, []);

  // 結果は数秒で自動的に消える（スタッフが押さなくても次に進める）
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(reset, 4000);
    return () => clearTimeout(timer);
  }, [result, reset]);

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-xl font-black text-kosei-800">
            挑戦券の読み取り
          </h1>
          <p className="text-xs text-kosei-600">特別企画スタッフ用</p>
        </div>
        <p className="text-sm font-bold text-kosei-600">
          本日 {count} 人
        </p>
      </div>

      {scanning ? (
        <>
          <p className="mb-2 text-sm text-kosei-700">
            来場者のQRコードをカメラに写してください
          </p>
          <QrScanner onDetected={onDetected} />
        </>
      ) : (
        <div className="rounded-3xl border-2 border-kosei-700 bg-white p-6 text-center shadow-[0_5px_0_var(--color-kosei-700)]">
          {checking ? (
            <p className="py-10 text-base font-bold text-kosei-600">確認中...</p>
          ) : result?.kind === "ok" ? (
            <div className="py-6">
              <p className="mb-3 text-6xl">✅</p>
              <p className="font-heading text-2xl font-black text-success-800">
                読み込み完了
              </p>
              <p className="mt-2 text-sm text-kosei-700">
                この方は挑戦できます
              </p>
            </div>
          ) : result?.kind === "already" ? (
            <div className="py-6">
              <p className="mb-3 text-6xl">⚠️</p>
              <p className="font-heading text-2xl font-black text-danger-800">
                スキャン済みです
              </p>
              <p className="mt-2 text-sm text-kosei-700">
                この券はすでに使われています
              </p>
              {result.usedAt && (
                <p className="mt-1 text-xs text-kosei-600">
                  使用日時: {formatTime(result.usedAt)}
                </p>
              )}
            </div>
          ) : result?.kind === "notfound" ? (
            <div className="py-6">
              <p className="mb-3 text-6xl">❓</p>
              <p className="font-heading text-xl font-black text-danger-800">
                この券は見つかりません
              </p>
              <p className="mt-2 text-sm text-kosei-700">
                渦潮祭アプリの挑戦券か確認してください
              </p>
            </div>
          ) : (
            <div className="py-6">
              <p className="mb-3 text-6xl">❓</p>
              <p className="font-heading text-xl font-black text-danger-800">
                読み取れませんでした
              </p>
            </div>
          )}

          <button
            onClick={reset}
            className="pressable mt-4 w-full rounded-2xl border-2 border-kosei-800 bg-kosei-600 p-4 font-heading text-base font-black text-white shadow-[0_4px_0_var(--color-kosei-800)]"
          >
            次の人を読み取る
          </button>
        </div>
      )}
    </div>
  );
}
