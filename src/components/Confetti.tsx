"use client";

import { useEffect, useRef } from "react";

// 紙吹雪の演出。外部ライブラリを使わず、canvasに自前で描いている。
//
// mode="sides"  … 左右から中央に向かって「バーン」と出る（スタンプGET用）
// mode="party"  … 左右＋上からたっぷり出る（コンプリート用・こちらの方が派手）
type Mode = "sides" | "party";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
};

const COLORS = [
  "#2B93B0", // 湖青
  "#4FB8D2",
  "#A0DBEA",
  "#E8825A", // アクセント
  "#F2AB3E",
  "#5FBE7E",
  "#ffffff",
];

function makeBurst(
  width: number,
  height: number,
  fromX: number,
  direction: number,
  count: number,
): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    // 中央に向かって斜め上に飛ばす
    const speed = 9 + Math.random() * 13;
    const angle = (-70 + Math.random() * 55) * (Math.PI / 180);
    pieces.push({
      x: fromX,
      y: height * (0.55 + Math.random() * 0.25),
      vx: Math.cos(angle) * speed * direction,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
    });
  }
  return pieces;
}

function makeRain(width: number, count: number): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: Math.random() * width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 3,
      vy: 3 + Math.random() * 4,
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
    });
  }
  return pieces;
}

export default function Confetti({ mode = "sides" }: { mode?: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 「動きを減らす」設定の人には出さない
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const count = mode === "party" ? 90 : 60;
    let pieces = [
      ...makeBurst(width, height, -10, 1, count),
      ...makeBurst(width, height, width + 10, -1, count),
    ];
    if (mode === "party") pieces = [...pieces, ...makeRain(width, 80)];

    let frame = 0;
    let stopped = false;

    function draw() {
      if (stopped || !ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // 重力
        p.vx *= 0.99; // 空気抵抗
        p.rotation += p.spin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      // 画面の下に出きったものは捨てる
      pieces = pieces.filter((p) => p.y < height + 60);
      if (pieces.length > 0) frame = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[80] h-full w-full"
    />
  );
}
