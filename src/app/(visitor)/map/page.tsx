"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import PannableZoom from "@/components/PannableZoom";
import FloorSlider from "@/components/FloorSlider";
import DetailSheet from "@/components/DetailSheet";
import { boothsFor, type Booth } from "@/lib/mockBooths";
import { waitColor } from "@/lib/waitColor";

const areas = [
  { id: "gym", name: "体育館" },
  { id: "senior", name: "高校棟" },
  { id: "junior", name: "中学棟" },
  { id: "schoolyard", name: "校庭" },
];

const floors = [4, 3, 2, 1, -1];

function MapContent() {
  const searchParams = useSearchParams();
  const initialArea = searchParams.get("area") ?? "gym";
  const [activeArea, setActiveArea] = useState(initialArea);
  const [activeFloor, setActiveFloor] = useState(4);
  const [selected, setSelected] = useState<Booth | null>(null);
  const hasFloors = activeArea === "senior" || activeArea === "junior";

  const rooms = boothsFor(
    activeArea as Booth["area"],
    hasFloors ? activeFloor : undefined
  );

  return (
    <>
    <div
      className="fixed inset-x-0 top-0"
      style={{ bottom: "calc(69px + max(env(safe-area-inset-bottom), 10px))" }}
    >
      <PannableZoom className="h-full w-full bg-zinc-900">
        <div className="relative h-full w-full">
          {rooms.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
              このフロアの企画情報は準備中です
            </p>
          )}
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelected(room)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${room.x}%`, top: `${room.y}%` }}
            >
              <span
                className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-white/70 text-2xl font-bold text-white shadow-lg"
                style={{ backgroundColor: waitColor(room.waitMinutes) }}
              >
                {room.waitMinutes}分
              </span>
              <span className="mt-2 max-w-[180px] truncate rounded bg-black/60 px-2 py-0.5 text-base text-white">
                {room.name}
              </span>
            </button>
          ))}
        </div>
      </PannableZoom>

      {/* 上部オーバーレイ：エリア選択 */}
      <div className="animate-fade-in-up pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3 pt-4">
        <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-2">
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setActiveArea(area.id)}
              className={`rounded-full border px-2 py-2 text-xs font-bold backdrop-blur-sm transition-transform active:scale-90 ${
                activeArea === area.id
                  ? "border-white/40 bg-white/20 text-white"
                  : "border-white/10 bg-black/30 text-zinc-300"
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
        <p className="pointer-events-none mt-2 text-center text-[11px] text-zinc-400">
          ピンチ／Ctrl+ホイールで拡大縮小、ドラッグで移動できます
        </p>
      </div>

      {hasFloors && (
        <FloorSlider
          floors={floors}
          value={activeFloor}
          onChange={setActiveFloor}
          className="bottom-6"
        />
      )}
    </div>

    <DetailSheet open={selected != null} onClose={() => setSelected(null)}>
      {selected && (
        <div>
          <p className="mb-1 text-xs text-zinc-400">{selected.category}</p>
          <h2 className="mb-2 text-xl font-bold">{selected.name}</h2>
          <p className="mb-4 text-sm text-zinc-300">{selected.description}</p>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ backgroundColor: waitColor(selected.waitMinutes) }}
            >
              待ち時間 約{selected.waitMinutes}分
            </span>
          </div>
        </div>
      )}
    </DetailSheet>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapContent />
    </Suspense>
  );
}
