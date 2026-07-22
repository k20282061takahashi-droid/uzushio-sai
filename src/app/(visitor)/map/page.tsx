"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

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
  const hasFloors = activeArea === "senior" || activeArea === "junior";

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">校内マップ</h1>

      <div className="animate-fade-in-up mb-4 grid grid-cols-4 gap-2" style={{ animationDelay: "40ms" }}>
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => setActiveArea(area.id)}
            className={`rounded-full px-2 py-2 text-xs font-bold transition-transform active:scale-90 ${
              activeArea === area.id
                ? "bg-sky-500/30 text-sky-300"
                : "bg-white/5 text-slate-400"
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
              className={`h-9 w-9 rounded-full text-sm font-bold transition-transform active:scale-90 ${
                activeFloor === floor
                  ? "bg-sky-500/30 text-sky-300"
                  : "bg-white/5 text-slate-400"
              }`}
            >
              {floor === -1 ? "B1" : `${floor}F`}
            </button>
          ))}
        </div>
      )}

      <div className="animate-fade-in-up flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-sm text-slate-500" style={{ animationDelay: "120ms" }}>
        {areas.find((a) => a.id === activeArea)?.name}
        {hasFloors ? ` ${activeFloor === -1 ? "B1" : `${activeFloor}F`}` : ""} のマップ（準備中）
      </div>
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
