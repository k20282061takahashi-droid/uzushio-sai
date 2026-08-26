"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Confetti from "@/components/Confetti";
import { CheckCircleIcon, CrownIcon, MapPinIcon } from "@/components/Icon";
import QrCode from "@/components/organizer/QrCode";
import {
  getOrCreateRewardTicket,
  rewardUrl,
  subscribeRewardTicket,
  type RewardTicket,
} from "@/lib/stamp";

// スタンプを全部集めた人だけが見るお祝いの画面。
// いちばん下に、特別企画で使える挑戦券のQRコードが出る。
export default function StampCompletePage() {
  const [ticket, setTicket] = useState<RewardTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const timer = setTimeout(async () => {
      setOrigin(window.location.origin);
      const t = await getOrCreateRewardTicket();
      setTicket(t);
      setLoading(false);
      // スタッフに読み取られた瞬間に「使用済み」へ切り替える
      if (t) unsubscribe = subscribeRewardTicket(t.code, setTicket);
    }, 0);
    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-10">
      <Confetti mode="party" />

      <div className="animate-fade-in-up mb-6 text-center">
        <CrownIcon className="mx-auto mb-2 h-14 w-14 text-warn-600" />
        <h1 className="font-heading text-3xl font-black leading-tight text-kosei-800">
          コンプリート
          <br />
          おめでとうございます！
        </h1>
        <p className="mt-3 text-sm font-bold text-kosei-600">
          スタンプを全部集めました
        </p>
      </div>

      {/* 特別企画への案内 */}
      <section
        className="animate-fade-in-up mb-6 rounded-3xl border-2 border-accent-700 bg-accent-50 p-4 shadow-[0_5px_0_var(--color-accent-700)]"
        style={{ animationDelay: "120ms" }}
      >
        <p className="mb-1 font-heading text-base font-black text-accent-700">
          特別企画に挑戦できます
        </p>
        <p className="mb-3 text-sm leading-relaxed text-kosei-800">
          下のQRコードを特別企画の受付で見せてください。
          スタッフが読み取ると、1回だけ挑戦できます。
        </p>
        <Link
          href="/map"
          className="pressable block rounded-2xl border-2 border-kosei-800 bg-white p-3 text-center shadow-[0_4px_0_var(--color-kosei-800)]"
        >
          <p className="flex items-center justify-center gap-2 font-heading text-sm font-black text-kosei-800">
            <MapPinIcon className="h-5 w-5 text-accent-700" />
            特別企画の場所をマップで見る
          </p>
        </Link>
      </section>

      {/* 挑戦券のQRコード */}
      <section
        className="animate-fade-in-up rounded-3xl border-2 border-kosei-700 bg-white p-5 text-center shadow-[0_5px_0_var(--color-kosei-700)]"
        style={{ animationDelay: "200ms" }}
      >
        <p className="mb-3 font-heading text-sm font-black text-kosei-800">
          特別企画 挑戦券
        </p>

        {loading ? (
          <p className="py-10 text-sm text-kosei-600">準備中...</p>
        ) : !ticket ? (
          <p className="py-10 text-sm text-danger-800">
            挑戦券を作れませんでした。ブラウザの設定（プライベートモードなど）を確認してください。
          </p>
        ) : ticket.used ? (
          <div className="py-8">
            <CheckCircleIcon className="mx-auto mb-2 h-16 w-16 text-success-800" />
            <p className="font-heading text-lg font-black text-success-800">
              使用済みです
            </p>
            <p className="mt-1 text-sm text-kosei-600">
              特別企画への参加ありがとうございました
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 inline-block rounded-2xl border-2 border-kosei-200 bg-white p-3">
              <QrCode value={rewardUrl(origin, ticket.code)} size={200} />
            </div>
            <p className="text-sm font-bold text-kosei-600">
              1回だけ使えます。読み取られると使用済みになります
            </p>
          </>
        )}
      </section>

      <Link
        href="/stamp"
        className="animate-fade-in-up mt-6 block text-center text-sm font-bold text-kosei-700"
        style={{ animationDelay: "260ms" }}
      >
        ← スタンプカードへ戻る
      </Link>
    </div>
  );
}
