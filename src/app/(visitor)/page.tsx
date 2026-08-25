import Link from "next/link";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import CampusMap from "@/components/CampusMap";
import StampSummary from "@/components/StampSummary";

const currentEvent = { time: "〜9:50", title: "吹奏楽部 演奏会", venue: "体育館" };
const nextEvent = { time: "10:00〜10:50", title: "有志ダンス", venue: "体育館" };

export default function VisitorHome() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <header className="animate-fade-in-up mb-4 text-center">
        <p className="text-sm tracking-widest text-kosei-700">2026</p>
        <h1 className="font-heading text-3xl font-black tracking-wide text-kosei-800">
          渦潮祭
        </h1>
      </header>

      {/* お知らせティッカー */}
      <div className="animate-fade-in-up mb-4" style={{ animationDelay: "40ms" }}>
        <AnnouncementTicker />
      </div>

      {/* 校内マップ（エリア選択） */}
      <section className="animate-fade-in-up mb-3" style={{ animationDelay: "80ms" }}>
        <CampusMap />
      </section>

      {/* 現在・次のイベント（どこを押してもタイムテーブルへ移動する） */}
      <Link
        href="/timeline"
        className="pressable animate-fade-in-up mb-6 block rounded-3xl border-2 border-kosei-700 bg-kosei-50 p-4 shadow-[0_5px_0_var(--color-kosei-700)]"
        style={{ animationDelay: "120ms" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-kosei-800 px-3.5 py-0.5 font-heading text-xs font-black text-white">
            Now
          </span>
          <span className="text-sm font-medium text-kosei-700">{currentEvent.time}</span>
        </div>
        <p className="mb-1 truncate font-heading text-xl font-black text-kosei-800">
          {currentEvent.title}
        </p>
        <p className="mb-3 text-xs text-kosei-600">@{currentEvent.venue}</p>

        <div className="flex items-center gap-2 border-t border-dashed border-kosei-200 pt-2 text-xs">
          <span className="shrink-0 rounded-full bg-kosei-500 px-2.5 py-0.5 font-bold text-white">
            Next
          </span>
          <span className="text-kosei-700">{nextEvent.time}</span>
          <span className="truncate font-bold text-kosei-800">{nextEvent.title}</span>
          <span className="ml-auto shrink-0 text-kosei-600">@{nextEvent.venue}</span>
        </div>
      </Link>

      {/* クイックリンク */}
      <section
        className="animate-fade-in-up mb-6 grid grid-cols-2 gap-3"
        style={{ animationDelay: "160ms" }}
      >
        <Link
          href="/lost-items"
          className="pressable flex flex-col items-center rounded-[22px] border-2 border-kosei-800 bg-kosei-500 p-4 text-center shadow-[0_5px_0_var(--color-kosei-800)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9"
            fill="none"
            stroke="white"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <line x1="20" y1="20" x2="15.8" y2="15.8" />
          </svg>
          <p className="mt-1.5 font-heading text-sm font-bold text-white">落とし物</p>
        </Link>
        <Link
          href="/rules"
          className="pressable flex flex-col items-center rounded-[22px] border-2 border-accent-700 bg-accent-400 p-4 text-center shadow-[0_5px_0_var(--color-accent-700)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9"
            fill="none"
            stroke="white"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z" />
            <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" />
          </svg>
          <p className="mt-1.5 font-heading text-sm font-bold text-white">来場者の皆さんへ</p>
        </Link>
      </section>

      {/* スタンプラリー（獲得状況はこの端末に保存される） */}
      <StampSummary />
    </div>
  );
}
