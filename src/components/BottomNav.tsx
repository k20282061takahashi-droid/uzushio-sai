"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/timeline", label: "タイムテーブル", icon: "🗓️" },
  { href: "/map", label: "マップ", icon: "🗺️" },
  { href: "/stamp", label: "スタンプ", icon: "🎫" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.href === pathname)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-900/90 backdrop-blur-md">
      <div className="relative mx-auto max-w-md">
        <div
          className="absolute top-0 h-0.5 bg-sky-400 transition-transform duration-300 ease-out"
          style={{
            width: `${100 / items.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        <ul className="grid grid-cols-4">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 py-2.5 text-xs transition-transform duration-150 ease-out active:scale-90 ${
                    isActive ? "text-sky-300" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`text-xl transition-transform duration-200 ${
                      isActive ? "-translate-y-0.5 scale-110" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
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
