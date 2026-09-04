"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

// アウトライン線画アイコン（雰囲気案v3で確定した仮アイコン）。
// 本採用のアイコンは別途決めて差し替える。
function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3.5 10.5 12 3l8.5 7.5" />
      <path d="M5.5 9v10a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" />
    </svg>
  );
}

function TimelineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3M16 3v3" />
      <path d="M7.5 13.2h2.2M11.9 13.2h2.2M16.3 13.2h.2M7.5 16.8h2.2M11.9 16.8h2.2" />
    </svg>
  );
}

function MapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.4 15.4 20 20" />
    </svg>
  );
}

function StampIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7H10l2-2.5L14 7h3.5A2.5 2.5 0 0 1 20 9.5v1a2 2 0 0 0 0 4v1A2.5 2.5 0 0 1 17.5 18H6.5A2.5 2.5 0 0 1 4 15.5v-1a2 2 0 0 0 0-4Z" />
      <path d="M12 7v2M12 15v2M12 10.8v2.4" />
    </svg>
  );
}

const items = [
  { href: "/", label: "ホーム", Icon: HomeIcon },
  { href: "/booths", label: "さがす", Icon: SearchIcon },
  { href: "/map", label: "マップ", Icon: MapIcon },
  // 5つ並ぶので「タイムテーブル」では横幅に収まらない。中身はイベントの予定表。
  { href: "/timeline", label: "イベント", Icon: TimelineIcon },
  { href: "/stamp", label: "スタンプ", Icon: StampIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.href === pathname)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-kosei-700 bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
    >
      <div className="mx-auto max-w-md">
        <ul className="grid grid-cols-5 gap-1 px-2 pt-2">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.Icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 whitespace-nowrap rounded-2xl px-0.5 py-1.5 text-[10px] font-bold transition-transform duration-150 ease-out active:scale-90 ${
                    isActive
                      ? "bg-kosei-600 text-white shadow-[0_3px_0_var(--color-kosei-800)]"
                      : "text-kosei-400"
                  }`}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2.2 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
