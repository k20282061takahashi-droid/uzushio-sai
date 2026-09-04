"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import BottomNav from "@/components/BottomNav";
import VisitRecorder from "@/components/VisitRecorder";
import AddToHomeHint from "@/components/AddToHomeHint";
import BeforeFestivalScreen from "@/components/BeforeFestivalScreen";
import {
  subscribeFestivalDays,
  subscribeFestivalPhase,
  type FestivalPhase,
} from "@/lib/booth";
import { disablePreview, isPreviewEnabled } from "@/lib/preview";

// 来場者アプリの外枠。「いま見せてよい状態か」をここで決める。
//
//  ・運営が「文化祭を開始する」を押す前  → 「文化祭まであと○日」だけを出す
//  ・押したあと                          → ふつうの来場者アプリ
//  ・/test を開いた端末                  → 開始前でもふつうの来場者アプリ（プレビュー）
//
// 開始前に中身を隠すのは、URLを知っている人に企画の内容が
// 先に全部見られてしまうのを防ぐため。

function usePreview() {
  // Cookieはページを開いている間は変わらないので、購読はしない。
  // サーバー側では常に false（＝プレビューではない）として描く。
  return useSyncExternalStore(
    () => () => {},
    () => isPreviewEnabled(),
    () => false,
  );
}

export default function VisitorShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const preview = usePreview();
  // null は「まだFirestoreから返事が来ていない」状態。
  // ここで安易に "before" と決めつけると、本番中に一瞬カウントダウンが
  // 見えてしまうので、分かるまでは何も出さない。
  const [phase, setPhase] = useState<FestivalPhase | null>(null);
  const [days, setDays] = useState<string[]>([]);
  // 通信が届かないまま時間が経ったかどうか。
  // 分からないのに「開催前」と決めつけると本番中に真っ白になり、
  // 「開催中」と決めつけると開始前に中身が見えてしまう。どちらも避けて、
  // 読み込めなかったことをそのまま伝える。
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => subscribeFestivalPhase(setPhase), []);
  useEffect(() => subscribeFestivalDays(setDays), []);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, []);

  if (phase === null) {
    // 読み込み中。背景（渦）とオープニング演出は外側で出ているので何も足さない。
    return timedOut ? <LoadFailedScreen /> : null;
  }

  if (phase === "before" && !preview) {
    return <BeforeFestivalScreen days={days} />;
  }

  return (
    <>
      {/* プレビューで見ている人は来場者数に数えない */}
      {!preview && <VisitRecorder />}

      {/* 下のタブに隠れないための余白。--nav-h はタブが自分の高さをはかって
          入れてくれるので、機種や文字サイズ設定が変わっても自動で合う。 */}
      <div
        className="relative z-10 flex-1"
        style={{ paddingBottom: "var(--nav-h)" }}
      >
        {children}
      </div>

      {preview && <PreviewBanner />}
      {/* iPhoneのブラウザで開いている人にだけ、1度だけ出す案内 */}
      {!preview && <AddToHomeHint />}

      <div className="relative z-10">
        <BottomNav />
      </div>
    </>
  );
}

// 通信が届かず、いまが開催前か開催中か分からなかったときの画面。
function LoadFailedScreen() {
  return (
    <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-heading font-black text-kosei-800">
        情報を読み込めませんでした
      </p>
      <p className="text-xs font-bold leading-relaxed text-kosei-600">
        電波の弱い場所ではうまく読み込めないことがあります。
        <br />
        場所を変えて、もう一度お試しください。
      </p>
      <button
        onClick={() => window.location.reload()}
        className="pressable rounded-full border-2 border-kosei-700 bg-white px-5 py-2 text-sm font-bold text-kosei-700 shadow-[0_3px_0_var(--color-kosei-700)]"
      >
        再読み込み
      </button>
    </main>
  );
}

// プレビューで見ていることを、本番と間違えないように知らせる帯。
function PreviewBanner() {
  return (
    <div
      className="fixed inset-x-0 z-[60] flex justify-center px-3"
      style={{ bottom: "calc(var(--nav-h) + 0.5rem)" }}
    >
      <div
        className="flex items-center gap-2 rounded-full border-2 border-accent-700 bg-accent-50/95 px-3 py-1.5 font-bold text-accent-700 shadow-[0_3px_0_var(--color-accent-700)] backdrop-blur"
        style={{ fontSize: "clamp(0.625rem, 2.9vw, 0.75rem)" }}
      >
        <span>プレビュー表示中（本番前）</span>
        <button
          onClick={() => {
            disablePreview();
            window.location.reload();
          }}
          className="rounded-full bg-accent-700 px-2 py-0.5 text-white"
        >
          終了
        </button>
      </div>
    </div>
  );
}
