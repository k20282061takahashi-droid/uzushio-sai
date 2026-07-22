"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/timeline", label: "タイムテーブル", icon: "🗓️" },
  { href: "/map", label: "マップ", icon: "🗺️" },
  { href: "/stamp", label: "スタンプ", icon: "🎫" },
];

// アイコン中心の、頂点(右下角)からの距離。0=スタンプ(一番近い)〜3=ホーム(一番遠い)
const COLLAPSED_INSETS = [14, 48, 82, 116];
const EXPANDED_INSETS = [20, 70, 120, 170];
const DIAG = Math.SQRT1_2; // 45度方向

const COLLAPSED_ICON = 60;
const EXPANDED_ICON = 70;
const STAIR_BOX = 150; // 収納時：階段シルエットの外枠
const CIRCLE_R = 45; // 展開時：円の半径（スタンプの距離とマップの距離の間）
const CONTAINER = 230;

function staircaseClipPath(box: number, insets: number[]) {
  const p = (x: number, y: number) => `${x}px ${y}px`;
  const pts = [p(box, box), p(box, box - insets[0]), p(box - insets[0], box - insets[0])];
  for (let i = 1; i < insets.length; i++) {
    pts.push(p(box - insets[i - 1], box - insets[i]));
    pts.push(p(box - insets[i], box - insets[i]));
  }
  pts.push(p(box - insets[insets.length - 1], box));
  return `polygon(${pts.join(", ")})`;
}

export default function RadialMenu() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-0 right-0 z-50"
      style={{ width: CONTAINER, height: CONTAINER }}
    >
      {/* 背景シェイプ（タップで開閉）：収納=階段シルエット／展開=円 */}
      <button
        aria-label={expanded ? "メニューを閉じる" : "メニューを開く"}
        onClick={() => setExpanded((v) => !v)}
        className="absolute bottom-0 right-0 border border-white/25 bg-gradient-to-tl from-zinc-500 to-zinc-700 shadow-lg transition-all duration-300 ease-out"
        style={
          expanded
            ? {
                width: CIRCLE_R,
                height: CIRCLE_R,
                borderTopLeftRadius: "100%",
                zIndex: 5,
              }
            : {
                width: STAIR_BOX,
                height: STAIR_BOX,
                clipPath: staircaseClipPath(STAIR_BOX, COLLAPSED_INSETS),
                zIndex: 0,
              }
        }
      />

      {/* アイコン */}
      {items.map((item, i) => {
        const isActive = pathname === item.href;
        const level = items.length - 1 - i; // 0=スタンプ...3=ホーム
        const offset = expanded ? EXPANDED_INSETS[level] : COLLAPSED_INSETS[level];
        const dx = -offset * DIAG;
        const dy = -offset * DIAG;
        const iconSize = expanded ? EXPANDED_ICON : COLLAPSED_ICON;
        const isStamp = level === 0;
        // 展開時のみ：スタンプだけ円の下に隠れ、他は円より前面に出る
        const zIndex = expanded ? (isStamp ? 1 : 10 + i) : 10 + i;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border font-bold transition-all duration-300 ease-out active:scale-90 ${
              isActive
                ? "border-white bg-white/25 text-white"
                : "border-white/30 bg-zinc-800/90 text-zinc-300"
            }`}
            style={{
              right: -dx,
              bottom: -dy,
              width: iconSize,
              height: iconSize,
              zIndex,
              transitionProperty: "right, bottom, width, height",
            }}
          >
            <span className="grayscale" style={{ fontSize: expanded ? 20 : 15 }}>
              {item.icon}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
