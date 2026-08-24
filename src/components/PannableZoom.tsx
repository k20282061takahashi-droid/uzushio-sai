"use client";

import { useEffect, useRef, useState } from "react";

type PointerInfo = { x: number; y: number };

const MIN_SCALE = 1; // 指を離したときに戻る大きさ（全体がちょうど見える）
const MAX_SCALE = 4;

// ---- 縮小しすぎたときの「引っぱり」挙動（iPhoneの写真アプリのような感触）----
//
// MIN_SCALE より小さくもできるが、縮めるほど効きが鈍くなり、
// 指を離すと MIN_SCALE にすっと戻る。
//
// RAW_MIN_SCALE : 指の動きとしてはここまで縮める操作を受け付ける
// VISUAL_MIN    : 実際の見た目としてはここまでしか小さくならない
// RESISTANCE    : 小さい方向へどれだけ反映するか（小さいほど重い）
const RAW_MIN_SCALE = 0.25;
const VISUAL_MIN_SCALE = 0.62;
const RESISTANCE = 0.4;

// 操作量（raw）を、実際に表示する倍率に変換する
function applyRubberBand(raw: number): number {
  if (raw >= MIN_SCALE) return Math.min(MAX_SCALE, raw);
  const under = MIN_SCALE - raw; // MIN_SCALE をどれだけ下回ったか
  return Math.max(VISUAL_MIN_SCALE, MIN_SCALE - under * RESISTANCE);
}

export default function PannableZoom({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  // 指を置いている間はアニメーションを切る（refはレンダー中に読めないためstateで持つ）
  const [interacting, setInteracting] = useState(false);
  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  const lastMid = useRef<PointerInfo | null>(null);
  const lastDist = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 指の動きをそのまま足しこんだ値。表示倍率とは別に持っておき、
  // ここから「引っぱり」を効かせた表示倍率を計算する。
  const rawScale = useRef(1);
  // ホイール操作は「指を離す」瞬間が無いので、動きが止まったら戻す
  const wheelSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPointsArray = () => Array.from(pointers.current.values());

  const distance = (a: PointerInfo, b: PointerInfo) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const midpoint = (a: PointerInfo, b: PointerInfo) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastDist.current = null;
    lastMid.current = null;
    setInteracting(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = getPointsArray();

    if (pts.length === 1) {
      const p = pts[0];
      if (lastMid.current) {
        const dx = p.x - lastMid.current.x;
        const dy = p.y - lastMid.current.y;
        setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
      }
      lastMid.current = p;
      lastDist.current = null;
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const mid = midpoint(a, b);
      const dist = distance(a, b);

      if (lastDist.current != null && lastMid.current) {
        const scaleDelta = dist / lastDist.current;
        setTransform((t) => {
          rawScale.current = Math.min(
            MAX_SCALE,
            Math.max(RAW_MIN_SCALE, rawScale.current * scaleDelta),
          );
          const newScale = applyRubberBand(rawScale.current);
          const rect = containerRef.current?.getBoundingClientRect();
          const originX = mid.x - (rect?.left ?? 0);
          const originY = mid.y - (rect?.top ?? 0);
          // ピンチ中心を固定して拡大縮小しつつ、中心の移動分も反映
          const dx = mid.x - (lastMid.current?.x ?? mid.x);
          const dy = mid.y - (lastMid.current?.y ?? mid.y);
          const k = newScale / t.scale;
          const newX = originX - (originX - t.x) * k + dx;
          const newY = originY - (originY - t.y) * k + dy;
          return { scale: newScale, x: newX, y: newY };
        });
      }
      lastMid.current = mid;
      lastDist.current = dist;
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    lastDist.current = null;
    lastMid.current = null;
    const pts = getPointsArray();
    if (pts.length === 1) {
      lastMid.current = pts[0];
    }
    if (pts.length === 0) setInteracting(false);
  };

  // 全体表示に戻す（ダブルタップ／リセットボタン）
  const resetView = () => {
    rawScale.current = 1;
    setTransform({ scale: 1, x: 0, y: 0 });
  };

  // 指を離したとき、縮めすぎていたら全体表示までなめらかに戻す
  const resetIfUnderscale = () => {
    if (rawScale.current < MIN_SCALE) {
      rawScale.current = MIN_SCALE;
      setTransform({ scale: MIN_SCALE, x: 0, y: 0 });
      return;
    }
    setTransform((t) => (t.scale <= MIN_SCALE ? { scale: 1, x: 0, y: 0 } : t));
  };

  // wheel はブラウザのデフォルトスクロール/ズームを止める必要があるため、
  // passive:false のネイティブリスナーで登録する（ReactのonWheelはpassiveになるため使えない）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const originX = e.clientX - rect.left;
      const originY = e.clientY - rect.top;
      setTransform((t) => {
        const factor = Math.exp(-e.deltaY * 0.01);
        rawScale.current = Math.min(
          MAX_SCALE,
          Math.max(RAW_MIN_SCALE, rawScale.current * factor),
        );
        const newScale = applyRubberBand(rawScale.current);
        const k = newScale / t.scale;
        const newX = originX - (originX - t.x) * k;
        const newY = originY - (originY - t.y) * k;
        return { scale: newScale, x: newX, y: newY };
      });

      // ホイールは「離す」動作が無いので、少し止まったら戻す
      if (wheelSettleTimer.current) clearTimeout(wheelSettleTimer.current);
      wheelSettleTimer.current = setTimeout(() => {
        if (rawScale.current < MIN_SCALE) {
          rawScale.current = MIN_SCALE;
          setTransform({ scale: MIN_SCALE, x: 0, y: 0 });
        }
      }, 160);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelSettleTimer.current) clearTimeout(wheelSettleTimer.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none select-none ${className ?? ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => {
        endPointer(e);
        resetIfUnderscale();
      }}
      onPointerCancel={endPointer}
      onDoubleClick={resetView}
    >
      <div
        className="absolute left-0 top-0 h-full w-full"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          transition: interacting ? "none" : "transform 0.15s ease-out",
        }}
      >
        {children}
      </div>
      {transform.scale > 1 && (
        <button
          onClick={resetView}
          className="absolute bottom-2 left-2 z-10 rounded-full border border-white/30 bg-black/60 px-2.5 py-1 text-[10px] text-white"
        >
          リセット
        </button>
      )}
    </div>
  );
}
