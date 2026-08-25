"use client";

import { useMemo, useState } from "react";
import {
  floorplanSrc,
  hasFloors,
  roomsFor,
  type AreaId,
} from "@/lib/floorplan";
import { waitColor } from "@/lib/waitColor";
import { waitMinutesOf } from "@/lib/boothGrouping";
import type { Booth } from "@/lib/booth";

// 図面のエリアと、企画データの「場所」の名前をつなぐ対応表。
// 本物の校内図に差し替えるときは、ここの名前を合わせてください。
const AREAS: { id: AreaId; name: string }[] = [
  { id: "senior", name: "高校棟" },
  { id: "junior", name: "中学棟" },
  { id: "gym", name: "体育館" },
  { id: "schoolyard", name: "校庭" },
];

const FLOORS = [4, 3, 2, 1, -1];

function floorLabel(f: number): string {
  return f === -1 ? "B1" : `${f}F`;
}

// 運営が図面を見ながら、企画の場所を直したり混み具合を確認したりする地図。
//
// ・企画を選んでいるときに部屋を押すと、その企画の場所が決まる
// ・選んでいないときは、各部屋に置かれた企画の混み具合を色で表示する
export default function BoothMapPicker({
  booths,
  selectedBooth,
  onPickRoom,
}: {
  booths: Booth[];
  selectedBooth: Booth | null;
  onPickRoom?: (area: AreaId, floor: number | undefined, room: string) => void;
}) {
  const [area, setArea] = useState<AreaId>("senior");
  const [floor, setFloor] = useState(4);

  const showFloors = hasFloors(area);
  const currentFloor = showFloors ? floor : undefined;
  const areaName = AREAS.find((a) => a.id === area)?.name ?? "";

  const rooms = roomsFor(area, currentFloor);

  // その部屋に入っている企画を引けるようにする
  const boothByRoom = useMemo(() => {
    const map = new Map<string, Booth>();
    for (const b of booths) {
      if (b.location !== areaName) continue;
      if (showFloors && b.floor !== floor) continue;
      // 場所の名前は「部屋名」をそのまま使っている
      if (b.roomName) map.set(b.roomName, b);
    }
    return map;
  }, [booths, areaName, showFloors, floor]);

  return (
    <div className="flex h-full flex-col">
      {/* エリアと階の切り替え */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {AREAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setArea(a.id)}
              className={
                area === a.id
                  ? "rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-slate-950"
                  : "rounded-lg bg-white/10 px-3.5 py-2 text-sm text-slate-300"
              }
            >
              {a.name}
            </button>
          ))}
        </div>
        {showFloors && (
          <div className="flex gap-1">
            {FLOORS.map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={
                  floor === f
                    ? "rounded-lg bg-sky-400 px-3 py-2 text-sm font-bold text-slate-950"
                    : "rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-300"
                }
              >
                {floorLabel(f)}
              </button>
            ))}
          </div>
        )}
        {selectedBooth && (
          <p className="ml-auto text-[13px] text-emerald-300">
            図面の部屋を押すと「{selectedBooth.name}」の場所になります
          </p>
        )}
      </div>

      {/* 図面 */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-2">
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={floorplanSrc(area, currentFloor)}
            alt=""
            className="block w-full select-none"
            draggable={false}
          />

          {rooms.map((room) => {
            const booth = boothByRoom.get(room.label);
            const minutes = booth ? waitMinutesOf(booth) : null;
            const isTarget = selectedBooth && booth?.id === selectedBooth.id;
            return (
              <button
                key={room.label}
                onClick={() =>
                  onPickRoom?.(area, currentFloor, room.label)
                }
                disabled={!onPickRoom || !selectedBooth}
                title={
                  booth
                    ? `${room.label}：${booth.name}`
                    : `${room.label}（企画なし）`
                }
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center disabled:cursor-default"
                style={{ left: `${room.x}%`, top: `${room.y}%` }}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[12px] font-bold text-white shadow ${
                    isTarget
                      ? "border-emerald-300 ring-2 ring-emerald-300"
                      : "border-white/70"
                  }`}
                  style={{
                    backgroundColor:
                      minutes !== null
                        ? waitColor(minutes)
                        : booth
                          ? "rgba(100,116,139,0.85)"
                          : "rgba(30,41,59,0.7)",
                  }}
                >
                  {minutes !== null ? `${minutes}分` : booth ? "―" : ""}
                </span>
                <span className="mt-0.5 max-w-[86px] truncate rounded bg-black/70 px-1 text-[11px] text-white">
                  {booth ? booth.name : room.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
