import Link from "next/link";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import CampusMap from "@/components/CampusMap";

const currentEvent = { time: "〜9:50", title: "吹奏楽部 演奏会", venue: "体育館" };
const nextEvent = { time: "10:00〜10:50", title: "有志ダンス", venue: "体育館" };

export default function VisitorHome() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <header className="animate-fade-in-up mb-4 text-center">
        <p className="text-sm tracking-widest text-zinc-400">2026</p>
        <h1 className="text-3xl font-bold tracking-wide">渦潮祭</h1>
      </header>

      {/* お知らせティッカー */}
      <div className="animate-fade-in-up mb-4" style={{ animationDelay: "40ms" }}>
        <AnnouncementTicker />
      </div>

      {/* 校内マップ（エリア選択） */}
      <section className="animate-fade-in-up mb-3" style={{ animationDelay: "80ms" }}>
        <CampusMap />
      </section>

      {/* 現在・次のイベント（小さめ表示） */}
      <section
        className="animate-fade-in-up mb-6 space-y-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full border border-white/40 px-1.5 py-0.5 font-bold text-white">
            Now
          </span>
          <span className="text-zinc-400">{currentEvent.time}</span>
          <span className="truncate font-bold">{currentEvent.title}</span>
          <span className="ml-auto shrink-0 text-zinc-500">@{currentEvent.venue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full border border-white/15 px-1.5 py-0.5 text-zinc-400">
            Next
          </span>
          <span className="text-zinc-400">{nextEvent.time}</span>
          <span className="truncate font-bold">{nextEvent.title}</span>
          <span className="ml-auto shrink-0 text-zinc-500">@{nextEvent.venue}</span>
        </div>
        <Link href="/timeline" className="block pt-0.5 text-right text-zinc-300 underline">
          タイムテーブルを見る →
        </Link>
      </section>

      {/* クイックリンク */}
      <section
        className="animate-fade-in-up mb-6 grid grid-cols-2 gap-3"
        style={{ animationDelay: "160ms" }}
      >
        <Link
          href="/lost-items"
          className="rounded-xl bg-white/5 p-4 text-center transition-transform active:scale-95"
        >
          <p className="text-2xl grayscale">🔍</p>
          <p className="mt-1 text-sm font-bold">落とし物</p>
        </Link>
        <Link
          href="/rules"
          className="rounded-xl bg-white/5 p-4 text-center transition-transform active:scale-95"
        >
          <p className="text-2xl grayscale">📖</p>
          <p className="mt-1 text-sm font-bold">来場者の皆さんへ</p>
        </Link>
      </section>

      {/* スタンプラリー進捗 */}
      <section
        className="animate-fade-in-up mb-8 rounded-2xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "200ms" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold">スタンプラリー</p>
          <p className="text-xs text-zinc-400">あと4個</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-white/15 bg-white/5">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{ width: "40%" }}
          />
        </div>
        <Link
          href="/stamp"
          className="mt-3 inline-block w-full rounded-xl border border-white/30 bg-white/5 py-2.5 text-center text-sm font-bold text-white transition-transform active:scale-95"
        >
          QRコードをスキャン
        </Link>
      </section>
    </div>
  );
}
