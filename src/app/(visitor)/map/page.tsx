"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import PannableZoom from "@/components/PannableZoom";
import FloorSlider from "@/components/FloorSlider";
import DetailSheet from "@/components/DetailSheet";
import BoothDetail from "@/components/BoothDetail";
import { subscribeVisitorBooths, type Booth } from "@/lib/booth";
import {
  placeBooths,
  waitMinutesOfBooth,
  type PlacedBooth,
} from "@/lib/boothPlacement";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);

  // 企画の情報をリアルタイムで受け取る（待ち時間もその場で変わる）
  useEffect(() => subscribeVisitorBooths(setBooths), []);

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
    setSelectedId(booth.id);
  }

  const showFloors = hasFloors(activeArea);
  const floor = showFloors ? activeFloor : undefined;

  const rooms = useMemo(
    () => placeBooths(booths, activeArea, floor),
    [booths, activeArea, floor],
  );
  const planSrc = floorplanSrc(activeArea, floor);
  // 選んでいる企画。一覧が更新されても最新の内容が出るようIDで引く
  const selected = booths.find((b) => b.id === selectedId) ?? null;

  return (
    <>
      <div
        className="fixed inset-x-0 top-0"
        style={{ bottom: "calc(69px + max(env(safe-area-inset-bottom), 10px))" }}
      >
        <PannableZoom className="h-full w-full bg-kosei-50">
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
                <p className="absolute inset-0 flex items-center justify-center bg-kosei-800/60 text-sm text-white">
                  このフロアの企画情報は準備中です
                </p>
              )}

              {rooms.map((room) => {
                const minutes = waitMinutesOfBooth(room);
                const closed = room.status === "closed";
                return (
                  <button
                    key={room.id}
                    onPointerDown={handlePinPress}
                    onClick={(e) => handlePinClick(e, room)}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${room.x}%`, top: `${room.y}%` }}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-[0_3px_0_rgba(18,73,90,0.55)]"
                      style={{
                        backgroundColor: closed
                          ? "#9C9C97"
                          : minutes !== null
                            ? waitColor(minutes)
                            : "var(--color-kosei-500)",
                      }}
                    >
                      {closed
                        ? "終了"
                        : minutes !== null
                          ? `${minutes}分`
                          : "開催"}
                    </span>
                    <span className="mt-1 max-w-[92px] truncate rounded-full bg-kosei-800/85 px-2 py-0.5 text-[10px] font-bold text-white">
                      {room.projectName || room.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </PannableZoom>

        {/* 上部オーバーレイ：エリア選択 */}
        <div className="animate-fade-in-up pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-kosei-50 via-kosei-50/90 to-transparent p-3 pt-4">
          <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-2">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveArea(area.id)}
                className={`pressable flex h-14 items-center justify-center rounded-full border-2 px-2 text-xs font-bold ${
                  activeArea === area.id
                    ? "border-kosei-800 bg-kosei-500 text-white shadow-[0_3px_0_var(--color-kosei-800)]"
                    : "border-kosei-700 bg-white text-kosei-700 shadow-[0_3px_0_var(--color-kosei-700)]"
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
          <p className="pointer-events-none mt-2 text-center text-xs font-bold text-kosei-600">
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

      <DetailSheet open={selected != null} onClose={() => setSelectedId(null)}>
        {selected && <BoothDetail booth={selected} />}
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
