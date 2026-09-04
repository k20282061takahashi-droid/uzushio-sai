import Link from "next/link";
import { CLASS_GROUP_LABELS } from "@/lib/boothGrouping";

/**
 * ホーム画面の検索バー。
 * ここでは文字を打たず、押すと「さがす」タブ（/booths）に移動する。
 * 学年のボタンを押した場合は、その学年でしぼりこんだ状態で開く。
 */
export default function HomeSearchBar() {
  return (
    <div>
      <Link
        href="/booths?focus=1"
        className="pressable flex w-full items-center gap-2 rounded-2xl border-2 border-kosei-700 bg-white px-4 py-3 shadow-[0_3px_0_var(--color-kosei-700)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="20" y1="20" x2="15.8" y2="15.8" />
        </svg>
        <span className="truncate text-[15px] font-bold text-kosei-400">
          クラス名・企画名でさがす
        </span>
      </Link>

      {/* 学年ですぐしぼりこめるボタン */}
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {CLASS_GROUP_LABELS.map((label, i) => (
          <Link
            key={label}
            href={`/booths?group=${i}`}
            className="pressable shrink-0 rounded-full border-2 border-kosei-300 bg-white px-3 py-1.5 text-[13px] font-bold text-kosei-700"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
