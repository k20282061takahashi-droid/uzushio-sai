"use client";

import { useMemo, useRef, useState } from "react";
import {
  floorplanSrc,
  hasFloors,
  roomsFor,
  type AreaId,
} from "@/lib/floorplan";
import { waitColor } from "@/lib/waitColor";
import { waitMinutesOf } from "@/lib/boothGrouping";
import { placeBooths } from "@/lib/boothPlacement";
import { updateBooth, type Booth } from "@/lib/booth";

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
  // ドラッグ中の企画とその位置（%）
  const [dragging, setDragging] = useState<{
    boothId: string;
    x: number;
    y: number;
  } | null>(null);
  const planRef = useRef<HTMLDivElement>(null);

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

  // 図面の上に置く企画（ドラッグで決めた座標があればそれを使う）
  const placed = useMemo(
    () => placeBooths(booths, area, currentFloor),
    [booths, area, currentFloor],
  );

  // 図面の中での位置を%で求める
  function pointToPercent(clientX: number, clientY: number) {
    const el = planRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    // 図面の外に出ないようにする
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
  }

  function onPinPointerDown(e: React.PointerEvent, boothId: string) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const point = pointToPercent(e.clientX, e.clientY);
    if (point) setDragging({ boothId, ...point });
  }

  function onPinPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const point = pointToPercent(e.clientX, e.clientY);
    if (point) setDragging({ ...dragging, ...point });
  }

  async function onPinPointerUp() {
    if (!dragging) return;
    const { boothId, x, y } = dragging;
    setDragging(null);
    // 小数第1位まで保存すれば十分（図面上で1%は数ピクセル）
    await updateBooth(boothId, {
      pinX: Math.round(x * 10) / 10,
      pinY: Math.round(y * 10) / 10,
    });
  }

  // ピンの位置を部屋の中心に戻す
  async function resetPin(boothId: string) {
    await updateBooth(boothId, { pinX: null, pinY: null });
  }

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
                  ? "rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-neutral-950"
                  : "rounded-lg bg-white/10 px-3.5 py-2 text-sm text-neutral-300"
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
                    ? "rounded-lg bg-white px-3 py-2 text-sm font-bold text-neutral-950"
                    : "rounded-lg bg-white/10 px-3 py-2 text-sm text-neutral-300"
                }
              >
                {floorLabel(f)}
              </button>
            ))}
          </div>
        )}
        {selectedBooth ? (
          <p className="ml-auto text-[13px] text-emerald-300">
            図面の部屋を押すと「{selectedBooth.name}」の場所になります
          </p>
        ) : (
          <p className="ml-auto text-[13px] text-neutral-400">
            企画のピンはドラッグで動かせます（右クリックで位置をもとに戻す）
          </p>
        )}
      </div>

      {/* 図面 */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-white/10 bg-neutral-950/40 p-2">
        <div
          ref={planRef}
          className="relative w-full touch-none"
          onPointerMove={onPinPointerMove}
          onPointerUp={onPinPointerUp}
          onPointerCancel={onPinPointerUp}
        >
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
                onClick={() => onPickRoom?.(area, currentFloor, room.label)}
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
                <span className="mt-0.5 max-w-[86px] truncate rounded bg-black/70 px-1 text-[12px] text-white">
                  {booth ? booth.name : room.label}
                </span>
              </button>
            );
          })}

          {/* 企画のピン。ドラッグで位置を直せる */}
          {placed.map((booth) => {
            const isDragging = dragging?.boothId === booth.id;
            const x = isDragging ? dragging.x : booth.x;
            const y = isDragging ? dragging.y : booth.y;
            const minutes = waitMinutesOf(booth);
            const isTarget = selectedBooth?.id === booth.id;
            return (
              <div
                key={`pin-${booth.id}`}
                onPointerDown={(e) => onPinPointerDown(e, booth.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  resetPin(booth.id);
                }}
                title={`${booth.name}（ドラッグで移動／右クリックでもとに戻す）`}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center active:cursor-grabbing ${
                  isDragging ? "z-30 scale-110" : "z-20"
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[12px] font-bold text-white shadow ${
                    isTarget
                      ? "border-emerald-300 ring-2 ring-emerald-300"
                      : "border-white"
                  }`}
                  style={{
                    backgroundColor:
                      minutes !== null
                        ? waitColor(minutes)
                        : "rgba(100,116,139,0.95)",
                  }}
                >
                  {minutes !== null ? `${minutes}分` : "―"}
                </span>
                <span className="mt-0.5 max-w-[96px] truncate rounded bg-black/80 px-1 text-[12px] text-white">
                  {booth.projectName || booth.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
