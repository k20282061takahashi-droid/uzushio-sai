"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import PannableZoom from "@/components/PannableZoom";
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
    <div className="mx-auto max-w-md px-4 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">校内マップ</h1>

      <div className="animate-fade-in-up mb-4 grid grid-cols-4 gap-2" style={{ animationDelay: "40ms" }}>
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => setActiveArea(area.id)}
            className={`rounded-full border px-2 py-2 text-xs font-bold transition-transform active:scale-90 ${
              activeArea === area.id
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-zinc-400"
            }`}
          >
            {area.name}
          </button>
        ))}
      </div>

      {hasFloors && (
        <div className="animate-fade-in-up mb-4 flex justify-center gap-2" style={{ animationDelay: "80ms" }}>
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`h-9 w-9 rounded-full border text-sm font-bold transition-transform active:scale-90 ${
                activeFloor === floor
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {floor === -1 ? "B1" : `${floor}F`}
            </button>
          ))}
        </div>
      )}

      <p className="animate-fade-in-up mb-2 text-[11px] text-zinc-500" style={{ animationDelay: "100ms" }}>
        ピンチ／Ctrl+ホイールで拡大縮小、ドラッグで移動できます
      </p>

      <PannableZoom className="animate-fade-in-up aspect-square w-full rounded-2xl border border-white/15 bg-zinc-900">
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
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 text-xs font-bold text-white shadow-lg"
                style={{ backgroundColor: waitColor(room.waitMinutes) }}
              >
                {room.waitMinutes}分
              </span>
              <span className="mt-1 max-w-[70px] truncate rounded bg-black/60 px-1 text-[9px] text-white">
                {room.name}
              </span>
            </button>
          ))}
        </div>
      </PannableZoom>

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
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapContent />
    </Suspense>
  );
}
