import Link from "next/link";

const rules = [
  "校舎内での飲食は指定された企画内のみでお願いします",
  "上履き・外靴の指定エリアを守ってください",
  "撮影した写真・動画のSNS投稿は許可された範囲でお願いします",
  "体調が悪くなった場合はすぐに近くのスタッフへお声がけください",
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <Link
        href="/"
        className="animate-fade-in-up mb-4 inline-block text-sm text-slate-400 transition-transform active:scale-95"
      >
        ← ホームへ戻る
      </Link>
      <h1
        className="animate-fade-in-up mb-4 text-2xl font-bold"
        style={{ animationDelay: "40ms" }}
      >
        来場者の皆さんへ
      </h1>
      <ul className="space-y-3">
        {rules.map((rule, i) => (
          <li
            key={rule}
            className="animate-fade-in-up rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            style={{ animationDelay: `${80 + i * 40}ms` }}
          >
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}
