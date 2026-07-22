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

const SPAN: [number, number] = [182, 268]; // 度（収納・展開共通）

// 展開時
const EXPANDED_HUB = 128;
const EXPANDED_RADIUS = 150;
const EXPANDED_ICON = 48;

// 収納時：展開をそのまま縮小するが、軌道半径(小円)の方が中心円より縮小率が大きい
// →小円が中心円の縁に重なる
const COLLAPSED_HUB = 84; // 128の約0.66倍
const COLLAPSED_RADIUS = 76; // 150の約0.51倍（縮小率が大きい）
const COLLAPSED_ICON = 24; // 48の0.5倍

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

  const hubSize = expanded ? EXPANDED_HUB : COLLAPSED_HUB;
  const radius = expanded ? EXPANDED_RADIUS : COLLAPSED_RADIUS;
  const iconSize = expanded ? EXPANDED_ICON : COLLAPSED_ICON;
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
        style={{ width: hubSize, height: hubSize, borderTopLeftRadius: "100%" }}
      />

      {/* サテライトアイコン */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-full w-full">
        {items.map((item, i) => {
          const isActive = pathname === item.href;
          const t = items.length > 1 ? i / (items.length - 1) : 0;
          const angle = SPAN[0] + (SPAN[1] - SPAN[0]) * t + rotation;
          const rad = (angle * Math.PI) / 180;
          const dx = Math.round(radius * Math.cos(rad) * 100) / 100;
          const dy = Math.round(radius * Math.sin(rad) * 100) / 100;

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
              <span className="grayscale" style={{ fontSize: expanded ? 16 : 10 }}>
                {item.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
