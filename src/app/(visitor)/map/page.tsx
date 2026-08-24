"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import PannableZoom from "@/components/PannableZoom";
import FloorSlider from "@/components/FloorSlider";
import DetailSheet from "@/components/DetailSheet";
import { boothsFor, type PlacedBooth } from "@/lib/mockBooths";
import { floorplanSrc, hasFloors, type AreaId } from "@/lib/floorplan";
import { waitColor } from "@/lib/waitColor";

const areas: { id: AreaId; name: string }[] = [
  { id: "gym", name: "体育館" },
  { id: "senior", name: "高校棟" },
  { id: "junior", name: "中学棟" },
  { id: "schoolyard", name: "校庭" },
];

const floors = [4, 3, 2, 1, -1];

function MapContent() {
  const searchParams = useSearchParams();
  const areaParam = searchParams.get("area");
  const initialArea: AreaId = areas.some((a) => a.id === areaParam)
    ? (areaParam as AreaId)
    : "gym";

  const [activeArea, setActiveArea] = useState<AreaId>(initialArea);
  const [activeFloor, setActiveFloor] = useState(4);
  const [selected, setSelected] = useState<PlacedBooth | null>(null);

  // 地図をドラッグして動かしたときに、指を置いた場所のピンが
  // 誤ってタップ扱いになるのを防ぐ。押した位置から一定以上動いていたら
  // 「移動」とみなして詳細を開かない。
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 8;

  function handlePinPress(e: React.PointerEvent) {
    pressPoint.current = { x: e.clientX, y: e.clientY };
  }

  function handlePinClick(e: React.MouseEvent, booth: PlacedBooth) {
    const start = pressPoint.current;
    pressPoint.current = null;
    if (start) {
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > DRAG_THRESHOLD_PX) return;
    }
    setSelected(booth);
  }

  const showFloors = hasFloors(activeArea);
  const floor = showFloors ? activeFloor : undefined;

  const rooms = boothsFor(activeArea, floor);
  const planSrc = floorplanSrc(activeArea, floor);

  return (
    <>
      <div
        className="fixed inset-x-0 top-0"
        style={{ bottom: "calc(69px + max(env(safe-area-inset-bottom), 10px))" }}
      >
        <PannableZoom className="h-full w-full bg-zinc-900">
          {/* 校内図と企画ピンをひとまとめにする。ピンの位置は図の左上を基準にした
              パーセント指定なので、拡大縮小しても図とピンがズレない。 */}
          <div className="flex h-full w-full items-center justify-center">
            {/* まずフロア全体が一目で見えるように横幅に合わせて表示する。
                細かい部分はピンチ／ホイールで拡大して見てもらう。
                枠が図とぴったり重なるので、ピンのパーセント座標が
                そのまま図面上の位置と一致する。 */}
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={planSrc}
                alt=""
                draggable={false}
                className="block w-full select-none"
              />

              {rooms.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-zinc-300">
                  このフロアの企画情報は準備中です
                </p>
              )}

              {rooms.map((room) => (
                <button
                  key={room.id}
                  onPointerDown={handlePinPress}
                  onClick={(e) => handlePinClick(e, room)}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${room.x}%`, top: `${room.y}%` }}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 text-xs font-bold text-white shadow-lg"
                    style={{ backgroundColor: waitColor(room.waitMinutes) }}
                  >
                    {room.waitMinutes}分
                  </span>
                  <span className="mt-1 max-w-[84px] truncate rounded bg-black/70 px-1 text-[9px] text-white">
                    {room.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </PannableZoom>

        {/* 上部オーバーレイ：エリア選択 */}
        <div className="animate-fade-in-up pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3 pt-4">
          <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-2">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveArea(area.id)}
                className={`flex h-14 items-center justify-center rounded-full border px-2 text-xs font-bold backdrop-blur-sm transition-transform active:scale-90 ${
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

        {showFloors && (
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
            <p className="mb-1 text-xs text-zinc-400">
              {selected.category} ・ {selected.room}
            </p>
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
