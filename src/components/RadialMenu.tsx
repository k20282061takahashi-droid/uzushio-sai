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

const COLLAPSED_HUB = 88;
const EXPANDED_HUB = 128;
const COLLAPSED_RADIUS = 74;
const EXPANDED_RADIUS = 150;
const COLLAPSED_SPAN: [number, number] = [198, 252]; // 度（縁に寄せて密集）
const EXPANDED_SPAN: [number, number] = [182, 268]; // 度（大きく展開）
const COLLAPSED_ICON = 34;
const EXPANDED_ICON = 48;

export default function RadialMenu() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const dragRef = useRef<{ startAngle: number; startRotation: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [spanStart, spanEnd] = expanded ? EXPANDED_SPAN : COLLAPSED_SPAN;
  const radius = expanded ? EXPANDED_RADIUS : COLLAPSED_RADIUS;
  const iconSize = expanded ? EXPANDED_ICON : COLLAPSED_ICON;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 right-0 z-50 touch-none"
      style={{ width: EXPANDED_RADIUS + 40, height: EXPANDED_RADIUS + 40 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* ハブ（扇形の背景・タップで開閉） */}
      <button
        aria-label={expanded ? "メニューを閉じる" : "メニューを開く"}
        onClick={() => setExpanded((v) => !v)}
        className="absolute bottom-0 right-0 border border-white/25 bg-gradient-to-tl from-zinc-500 to-zinc-700 shadow-lg transition-all duration-300 ease-out"
        style={{
          width: hubSize,
          height: hubSize,
          borderTopLeftRadius: "100%",
        }}
      />

      {/* サテライトアイコン */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-full w-full">
        {items.map((item, i) => {
          const isActive = pathname === item.href;
          const t = items.length > 1 ? i / (items.length - 1) : 0;
          const angle = spanStart + (spanEnd - spanStart) * t + rotation;
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
              <span
                className="grayscale"
                style={{ fontSize: expanded ? 16 : 13 }}
              >
                {item.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
