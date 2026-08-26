"use client";
import { useEffect, useRef } from "react";

// 渦のパラメータ（固定値）
const B = 0.28; // 巻き込みの強さ
const HOLE = 11; // 中心の穴の大きさ
const WOBBLE = 0.05; // 揺らぎの強さ
const FOAM_COUNT = 2; // 白い波の本数
const SPEED = 2.0; // 回転速度
const ARMS = 5;
const LINE_COLOR = "#A0DBEA";
const CANVAS_SIZE = 320;
const MAX_R = 145;

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
const LINE_RGB = hexToRgb(LINE_COLOR);

type ArmSeed = number;
type FoamSeed = { phase: number; speedMul: number; r0: number };

export default function WhirlpoolAnimation({
  size = CANVAS_SIZE,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const tRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const armSeeds: ArmSeed[] = Array.from(
      { length: ARMS },
      () => Math.random() * 10
    );
    const foamSeeds: FoamSeed[] = Array.from({ length: FOAM_COUNT }, () => ({
      phase: Math.random() * 10,
      speedMul: 0.7 + Math.random() * 0.6,
      r0: 0.3 + Math.random() * 0.6,
    }));

    const scale = size / CANVAS_SIZE;

    const draw = () => {
      const cx = size / 2;
      const cy = size / 2;
      const maxR = MAX_R * scale;
      const hole = HOLE * scale;

      ctx.clearRect(0, 0, size, size);

      const arms = ARMS;
      const thetaMax = 5.5 * Math.PI;
      const steps = 1400;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let k = 0; k < arms; k++) {
        const offset =
          (2 * Math.PI / arms) * k + tRef.current * 0.012 * SPEED;
        const seed = armSeeds[k];
        let prevX: number | null = null;
        let prevY: number | null = null;

        for (let i = 0; i <= steps; i++) {
          const theta = (thetaMax * i) / steps;
          let r = hole + 2.2 * scale * Math.exp(B * theta);
          if (r > maxR - 4 * scale) break;

          const wobble =
            1 +
            WOBBLE * Math.sin(theta * 3 + seed) +
            WOBBLE * 0.5 * Math.sin(theta * 7 + seed * 2);
          r *= wobble;

          const x = cx + r * Math.cos(theta + offset);
          const y = cy + r * Math.sin(theta + offset);

          if (prevX !== null && prevY !== null) {
            const frac = (r - hole) / (maxR - hole);
            const widthFrac = Math.max(0.12, frac);
            const opacity = Math.max(0, Math.pow(1 - frac, 2.2));
            ctx.strokeStyle = `rgba(${LINE_RGB[0]},${LINE_RGB[1]},${LINE_RGB[2]},${opacity.toFixed(2)})`;
            ctx.lineWidth = Math.max(1, 9 * scale * widthFrac);
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          prevX = x;
          prevY = y;
        }
      }

      for (let f = 0; f < FOAM_COUNT; f++) {
        const fs = foamSeeds[f];
        const foamOffset =
          tRef.current * 0.012 * SPEED * fs.speedMul + fs.phase;
        let prevX: number | null = null;
        let prevY: number | null = null;
        const steps2 = 500;

        for (let i = 0; i <= steps2; i++) {
          const theta = (thetaMax * i) / steps2;
          let r = hole + 2.2 * scale * fs.r0 * Math.exp(B * theta);
          if (r > maxR - 6 * scale) break;

          const wobble =
            1 +
            0.05 * Math.sin(theta * 4 + fs.phase * 2) +
            0.03 * Math.sin(theta * 9 + fs.phase);
          r *= wobble;

          const x = cx + r * Math.cos(theta + foamOffset);
          const y = cy + r * Math.sin(theta + foamOffset);

          if (prevX !== null && prevY !== null) {
            const frac = (r - hole) / (maxR - hole);
            const opacity = Math.max(0, Math.pow(1 - frac, 2.2)) * 0.6;
            ctx.strokeStyle = `rgba(255,255,255,${opacity.toFixed(2)})`;
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          prevX = x;
          prevY = y;
        }
      }

      tRef.current += 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  );
}
