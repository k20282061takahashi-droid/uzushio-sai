"use client";

import { useEffect, useRef } from "react";

// floors は上から下の表示順（先頭が最上階）。ドラッグ/クリック/スクロールで
// 上に行くほど上の階、下に行くほど下の階を選択できる縦スライドバー。
export default function FloorSlider({
  floors,
  value,
  onChange,
  className,
}: {
  floors: number[];
  value: number;
  onChange: (floor: number) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndex = floors.indexOf(value);

  const pickFromClientY = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const index = Math.round(ratio * (floors.length - 1));
    const floor = floors[index];
    if (floor !== undefined && floor !== value) onChange(floor);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pickFromClientY(e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    pickFromClientY(e.clientY);
  };

  // wheel はブラウザのデフォルトスクロールを止める必要があるため、
  // passive:false のネイティブリスナーで登録する
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const step = e.deltaY > 0 ? 1 : -1;
      const currentIndex = floors.indexOf(value);
      const nextIndex = Math.min(floors.length - 1, Math.max(0, currentIndex + step));
      const floor = floors[nextIndex];
      if (floor !== undefined && floor !== value) onChange(floor);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [floors, value, onChange]);

  // 1階分のセルの高さ。選択中の階はこのセル全体がカプセル状にハイライトされる
  // （エレベーターの階数ボタンのような見た目）。
  const CELL_H = 52;

  return (
    <div
      className={`absolute right-3 z-10 rounded-full border-2 border-white/30 bg-kosei-800/70 p-1.5 backdrop-blur-sm ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="relative flex w-11 cursor-pointer flex-col"
        style={{ height: `${floors.length * CELL_H}px` }}
      >
        {/* 選択中の階を示す縦長カプセル。階から階へ滑らかに移動する */}
        <div
          className="pointer-events-none absolute inset-x-0.5 rounded-full border-2 border-kosei-200 bg-white shadow-[0_0_0_4px_rgba(160,219,234,0.45),0_2px_6px_rgba(18,73,90,0.35)] transition-[top] duration-200 ease-out"
          style={{
            top: `${activeIndex * CELL_H}px`,
            height: `${CELL_H}px`,
          }}
        />
        {floors.map((floor, i) => (
          <div
            key={floor}
            className="relative z-10 flex flex-col items-center justify-center leading-none"
            style={{ height: `${CELL_H}px` }}
          >
            <span
              className={`pointer-events-none select-none text-base font-heading font-black transition-colors ${
                i === activeIndex ? "text-kosei-800" : "text-white/85"
              }`}
            >
              {floor === -1 ? "B1" : floor}
            </span>
            {floor !== -1 && (
              <span
                className={`pointer-events-none select-none text-[10px] font-bold transition-colors ${
                  i === activeIndex ? "text-kosei-600" : "text-white/60"
                }`}
              >
                F
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
