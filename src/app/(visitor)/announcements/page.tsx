import Link from "next/link";

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <Link
        href="/"
        className="animate-fade-in-up mb-4 inline-block text-sm text-slate-400 transition-transform active:scale-95"
      >
        ← ホームへ戻る
      </Link>
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold" style={{ animationDelay: "40ms" }}>
        来場者の皆さんへ
      </h1>
      <p className="animate-fade-in-up text-sm text-slate-500" style={{ animationDelay: "80ms" }}>
        現在お知らせはありません（準備中）
      </p>
    </div>
  );
}
