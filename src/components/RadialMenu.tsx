"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const items = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/timeline", label: "タイムテーブル", icon: "🗓️" },
  { href: "/map", label: "マップ", icon: "🗺️" },
  { href: "/stamp", label: "スタンプ", icon: "🎫" },
];

// 収納時：右下の四角いブロックに、アイコンが斜めの階段状に重なって並ぶ（全アイコン視認可能）
const BLOCK_W = 96;
const BLOCK_H = 124;
const STAIR_BASE = 14;
const STAIR_STEP = 34;
const COLLAPSED_ICON = 60;

// 展開時：扇形のハブより一回り外側の軌道に、間隔を空けて並ぶ（ドラッグで少し回転可）
const EXPANDED_HUB = 128;
const EXPANDED_RADIUS = 150;
const EXPANDED_SPAN: [number, number] = [182, 268]; // 度
const EXPANDED_ICON = 48;

const DIAG = Math.SQRT1_2; // cos(225°) = sin(225°) = -1/√2

export default function RadialMenu() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const dragRef = useRef<{ startAngle: number; startRotation: number } | null>(null);

  useEffect(() => {
    if (!expanded) setRotation(0);
  }, [expanded]);

  const vertexAngle = (clientX: number, clientY: number) => {
    const vx = window.innerWidth;
    const vy = window.innerHeight;
    return (Math.atan2(clientY - vy, clientX - vx) * 180) / Math.PI;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!expanded) return;
    dragRef.current = {
      startAngle: vertexAngle(e.clientX, e.clientY),
      startRotation: rotation,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const angle = vertexAngle(e.clientX, e.clientY);
    const delta = angle - dragRef.current.startAngle;
    const next = dragRef.current.startRotation + delta;
    setRotation(Math.max(-35, Math.min(35, next)));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const containerSize = EXPANDED_RADIUS + EXPANDED_ICON / 2 + 24;

  return (
    <div
      className="fixed bottom-0 right-0 z-50 touch-none"
      style={{ width: containerSize, height: containerSize }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* ハブ（タップで開閉） */}
      <button
        aria-label={expanded ? "メニューを閉じる" : "メニューを開く"}
        onClick={() => setExpanded((v) => !v)}
        className="absolute bottom-0 right-0 border border-white/25 bg-gradient-to-tl from-zinc-500 to-zinc-700 shadow-lg transition-all duration-300 ease-out"
        style={
          expanded
            ? { width: EXPANDED_HUB, height: EXPANDED_HUB, borderTopLeftRadius: "100%" }
            : { width: BLOCK_W, height: BLOCK_H, borderRadius: 8 }
        }
      />

      {/* サテライトアイコン */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-full w-full">
        {items.map((item, i) => {
          const isActive = pathname === item.href;
          let dx: number;
          let dy: number;
          const iconSize = expanded ? EXPANDED_ICON : COLLAPSED_ICON;

          if (expanded) {
            const t = items.length > 1 ? i / (items.length - 1) : 0;
            const angle = EXPANDED_SPAN[0] + (EXPANDED_SPAN[1] - EXPANDED_SPAN[0]) * t + rotation;
            const rad = (angle * Math.PI) / 180;
            dx = Math.round(EXPANDED_RADIUS * Math.cos(rad) * 100) / 100;
            dy = Math.round(EXPANDED_RADIUS * Math.sin(rad) * 100) / 100;
          } else {
            // 階段状：末尾（スタンプ）ほどブロックに近く、先頭（ホーム）ほど離れる
            const level = items.length - 1 - i;
            const offset = STAIR_BASE + level * STAIR_STEP;
            dx = -offset * DIAG;
            dy = -offset * DIAG;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border font-bold transition-all duration-300 ease-out active:scale-90 ${
                isActive
                  ? "border-white bg-white/25 text-white"
                  : "border-white/30 bg-zinc-800/90 text-zinc-300"
              }`}
              style={{
                right: -dx,
                bottom: -dy,
                width: iconSize,
                height: iconSize,
                zIndex: i,
                transitionProperty: "right, bottom, width, height",
              }}
            >
              <span className="grayscale" style={{ fontSize: expanded ? 16 : 15 }}>
                {item.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
