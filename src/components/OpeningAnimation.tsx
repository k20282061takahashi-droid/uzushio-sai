"use client";

import { useEffect, useRef } from "react";

// ===== 設定 =====
const BG = "#C9EAF3";
const COLORS = ["#2B93B0", "#175A70", "#4FB8D2", "#78CCE0"];
const ACCENT = "#E8825A";

const MAIN_TEXT = "渦潮祭";
const YEAR_TEXT = "2026";
const MAIN_FONT_SIZE = 42;
const MAIN_LINE_HEIGHT = 54;
const YEAR_FONT_SIZE = 16;
const YEAR_LINE_HEIGHT = 20;
const YEAR_GAP = 28; // 本体テキストとの横の間隔

const CANVAS_SIZE = { w: 240, h: 480 };

// タイムライン（ミリ秒）
const SWIRL_END = 2600;
const FADE_START = 2300;
const FADE_END = 2900;
const DURATION_TOTAL = 3500;

// 粒の輪郭のぼかし具合。始まった直後は縁がぼやけ、文字になるにつれて縁がはっきりする。
// 画面全体ではなく、粒1つ1つの縁だけをぼかす。
const SOFT_MAX = 1.1; // 最初のぼかしの強さ（粒の半径に対する割合）
const SOFT_END = SWIRL_END; // ここまでに縁がはっきりする
const SOFT_STEPS = 12; // 段階の数（この数だけ絵を作り置きして使い回す）
const SPRITE_SIZE = 64; // 作り置きする粒の絵の大きさ（px）

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

type Particle = {
  startAngle: number;
  startDist: number;
  tx: number;
  ty: number;
  delay: number;
  swirlAmount: number;
  rStart: number;
  rEnd: number;
  color: string;
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function OpeningAnimation({
  width = CANVAS_SIZE.w,
  height = CANVAS_SIZE.h,
  onComplete,
  className,
}: {
  width?: number;
  height?: number;
  /** アニメーション終了時に呼ばれるコールバック（画面遷移などに使用） */
  onComplete?: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = width / CANVAS_SIZE.w;
    const scaleY = height / CANVAS_SIZE.h;
    const CX = width / 2;
    const CY = height / 2;

    const mainFontSize = MAIN_FONT_SIZE * Math.min(scaleX, scaleY);
    const mainLineHeight = MAIN_LINE_HEIGHT * Math.min(scaleX, scaleY);
    const yearFontSize = YEAR_FONT_SIZE * Math.min(scaleX, scaleY);
    const yearLineHeight = YEAR_LINE_HEIGHT * Math.min(scaleX, scaleY);
    const yearGap = YEAR_GAP * Math.min(scaleX, scaleY);

    // 縁のぼけ具合ごとに「粒の絵」を作り置きしておき、毎回それを貼る。
    // 毎フレーム描き直すより軽く、スマホでもなめらかに動く。
    const spriteCache = new Map<string, HTMLCanvasElement>();

    function getSprite(color: string, softStep: number): HTMLCanvasElement {
      const key = `${color}|${softStep}`;
      const cached = spriteCache.get(key);
      if (cached) return cached;

      const soft = (softStep / SOFT_STEPS) * SOFT_MAX;
      const sprite = document.createElement("canvas");
      sprite.width = SPRITE_SIZE;
      sprite.height = SPRITE_SIZE;
      const sctx = sprite.getContext("2d")!;
      const c = SPRITE_SIZE / 2;
      const [r, g, b] = hexToRgb(color);
      // 中心から「芯の大きさ」までは色をそのまま、そこから外へ向けて薄く消していく
      const core = 1 / (1 + soft);
      const grad = sctx.createRadialGradient(c, c, 0, c, c, c);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(Math.max(0, core - 0.02), `rgba(${r},${g},${b},1)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(c, c, c, 0, Math.PI * 2);
      sctx.fill();
      spriteCache.set(key, sprite);
      return sprite;
    }

    function mainTextStartY() {
      const totalHeight = MAIN_TEXT.length * mainLineHeight;
      return CY - totalHeight / 2 + mainLineHeight / 2;
    }

    // 文字の形からターゲット座標をサンプリングする
    function getTextTargetPoints() {
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const octx = off.getContext("2d");
      if (!octx) return [];
      octx.clearRect(0, 0, width, height);
      octx.fillStyle = "#000";
      octx.font = `700 ${mainFontSize}px "Zen Maru Gothic", sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      const chars = MAIN_TEXT.split("");
      const startY = mainTextStartY();
      chars.forEach((c, i) => {
        octx.fillText(c, CX, startY + i * mainLineHeight);
      });
      const data = octx.getImageData(0, 0, width, height).data;
      const pts: { x: number; y: number }[] = [];
      const step = Math.max(2, Math.round(3 * Math.min(scaleX, scaleY)));
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 128) {
            pts.push({ x, y });
          }
        }
      }
      return pts;
    }

    // くっきりした最終文字（メイン＋年号）を描画
    function drawCrispText(alpha: number) {
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = "#12495A";

      // メインタイトル（縦書き）
      ctx!.font = `700 ${mainFontSize}px "Zen Maru Gothic", sans-serif`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      const chars = MAIN_TEXT.split("");
      const startY = mainTextStartY();
      chars.forEach((c, i) => {
        ctx!.fillText(c, CX, startY + i * mainLineHeight);
      });

      // 年号：縦書き、本体の左脇に小さく、下端を揃える
      ctx!.font = `600 ${yearFontSize}px "Zen Maru Gothic", sans-serif`;
      const yearChars = YEAR_TEXT.split("");
      const yearTotalHeight = yearChars.length * yearLineHeight;
      const mainBottom = startY + (MAIN_TEXT.length - 1) * mainLineHeight + mainLineHeight / 2;
      const yearStartY = mainBottom - yearTotalHeight + yearLineHeight / 2;
      const yearX = CX - yearGap;
      ctx!.fillStyle = "#2B93B0";
      yearChars.forEach((c, i) => {
        ctx!.fillText(c, yearX, yearStartY + i * yearLineHeight);
      });

      ctx!.restore();
    }

    function spawnParticles() {
      const targetPoints = getTextTargetPoints();
      const count = Math.min(targetPoints.length, 420);
      const shuffled = [...targetPoints]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      const maxDist = 90 * Math.min(scaleX, scaleY);
      const minDist = 220 * Math.min(scaleX, scaleY);

      particlesRef.current = shuffled.map((target) => {
        const angle = rand(0, Math.PI * 2);
        const dist = rand(maxDist, minDist);
        const isAccent = Math.random() < 0.15;
        return {
          startAngle: angle,
          startDist: dist,
          tx: target.x,
          ty: target.y,
          delay: rand(0, 500),
          swirlAmount: rand(2.2, 4.0) * (Math.random() < 0.5 ? 1 : -1),
          rStart: rand(3.5, 5.5) * Math.min(scaleX, scaleY),
          rEnd: rand(0.8, 1.4) * Math.min(scaleX, scaleY),
          color: isAccent
            ? ACCENT
            : COLORS[Math.floor(Math.random() * COLORS.length)],
        };
      });
    }

    function draw(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;

      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, width, height);

      // この瞬間の縁のぼけ具合（全部の粒で共通。時間が進むほど0に近づく）
      const softT = Math.min(1, elapsed / SOFT_END);
      const softStep = Math.round((1 - easeInOutCubic(softT)) * SOFT_STEPS);

      const particleFade =
        elapsed < FADE_START
          ? 1
          : Math.max(0, 1 - (elapsed - FADE_START) / (FADE_END - FADE_START));

      particlesRef.current.forEach((p) => {
        const localT = elapsed - p.delay;
        const dur = SWIRL_END - p.delay;
        const t = Math.max(0, Math.min(1, localT / dur));
        const eased = easeInOutCubic(t);

        const angle = p.startAngle + p.swirlAmount * (1 - eased) * Math.PI;
        const dist = p.startDist * (1 - eased);
        const swirlX = CX + Math.cos(angle) * dist;
        const swirlY = CY + Math.sin(angle) * dist;

        const x = swirlX + (p.tx - CX) * eased;
        const y = swirlY + (p.ty - CY) * eased;

        const r = p.rStart + (p.rEnd - p.rStart) * eased;

        const alpha = (0.5 + 0.5 * eased) * particleFade;
        if (alpha <= 0.01) return;

        // ぼけている分だけ絵は大きくなるが、芯の大きさは r のまま保たれる
        const draw = r * (1 + (softStep / SOFT_STEPS) * SOFT_MAX);
        ctx!.globalAlpha = alpha;
        ctx!.drawImage(
          getSprite(p.color, softStep),
          x - draw,
          y - draw,
          draw * 2,
          draw * 2,
        );
      });
      ctx!.globalAlpha = 1;

      const textAlpha =
        elapsed < FADE_START
          ? 0
          : Math.min(1, (elapsed - FADE_START) / (FADE_END - FADE_START));
      if (textAlpha > 0) drawCrispText(textAlpha);

      if (elapsed < DURATION_TOTAL) {
        frameRef.current = requestAnimationFrame(draw);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }

    spawnParticles();
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: "block" }}
      aria-label="渦潮祭 2026 オープニングアニメーション"
    />
  );
}
