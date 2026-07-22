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

  return (
    <div
      className={`absolute right-3 z-10 flex flex-col items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-4 ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="relative flex w-8 cursor-pointer flex-col items-center justify-between py-1"
        style={{ height: `${floors.length * 34}px` }}
      >
        <div className="absolute top-1 bottom-1 left-1/2 w-px -translate-x-1/2 bg-white/20" />
        {floors.map((floor, i) => (
          <div key={floor} className="relative z-10 flex h-0 items-center justify-center">
            <span
              className={`pointer-events-none select-none text-xs font-bold transition-colors ${
                i === activeIndex ? "text-white" : "text-zinc-500"
              }`}
            >
              {floor === -1 ? "B1" : floor}
            </span>
          </div>
        ))}
        <div
          className="pointer-events-none absolute left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-800 shadow transition-[top] duration-150 ease-out"
          style={{
            top: `${(activeIndex / Math.max(1, floors.length - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
