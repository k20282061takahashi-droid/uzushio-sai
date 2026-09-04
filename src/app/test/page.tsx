"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { enablePreview } from "@/lib/preview";

// 関係者向けのプレビュー入口。
//
// https://uzushio-sai.vercel.app/test を開くと、この端末（ブラウザ）だけ
// 「文化祭前でも本番と同じ来場者アプリを見られる」状態にして、ホームに移動する。
// 中身は本番とまったく同じもので、企画や待ち時間の変更もそのまま反映される。
//
// 移動したあとは、タブを押しても検索しても本番と同じように使える。
// 画面の下に出る「プレビュー表示中」の帯から、いつでも元に戻せる。
export default function PreviewEntryPage() {
  const router = useRouter();

  useEffect(() => {
    enablePreview();
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-kosei-50 px-6 text-center">
      <p className="font-heading text-base font-black text-kosei-800">
        プレビューを準備しています…
      </p>
    </main>
  );
}
