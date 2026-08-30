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

const FLOORS = [4, 3, 2, 1];

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
  // ピンを部屋の中心に戻すときの確認。企画IDが入っていれば個別、
  // confirmAllReset が true ならこのフロア全体。
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [confirmAllReset, setConfirmAllReset] = useState(false);
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

  // ドラッグで動かされている企画（＝もとに戻せる企画）
  const moved = placed.filter((b) => b.pinX !== null || b.pinY !== null);
  const resetBooth = placed.find((b) => b.id === resetTarget) ?? null;

  async function doResetOne() {
    if (!resetTarget) return;
    const id = resetTarget;
    setResetTarget(null);
    await resetPin(id);
  }

  async function doResetAll() {
    const ids = moved.map((b) => b.id);
    setConfirmAllReset(false);
    await Promise.all(ids.map((id) => resetPin(id)));
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
                  : "rounded-lg bg-neutral-900/75 px-3.5 py-2 text-sm text-neutral-300"
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
                    : "rounded-lg bg-neutral-900/75 px-3 py-2 text-sm text-neutral-300"
                }
              >
                {floorLabel(f)}
              </button>
            ))}
          </div>
        )}
        {/* 右側：今できる操作の案内と、ピンを部屋の中心に戻す操作 */}
        <div className="ml-auto flex items-center gap-2">
          {resetBooth ? (
            <>
              <span className="text-[13px] text-amber-300">
                「{resetBooth.projectName || resetBooth.name}」のピンを
                {resetBooth.roomName ? `「${resetBooth.roomName}」` : "部屋"}
                の中心に戻します
              </span>
              <button
                onClick={doResetOne}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-[13px] font-bold text-neutral-950"
              >
                戻す
              </button>
              <button
                onClick={() => setResetTarget(null)}
                className="rounded-lg bg-neutral-800 px-3 py-1.5 text-[13px] text-neutral-300"
              >
                やめる
              </button>
            </>
          ) : confirmAllReset ? (
            <>
              <span className="text-[13px] text-amber-300">
                このフロアで動かした {moved.length} 件を、すべて部屋の中心に戻します
              </span>
              <button
                onClick={doResetAll}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-[13px] font-bold text-neutral-950"
              >
                全部戻す
              </button>
              <button
                onClick={() => setConfirmAllReset(false)}
                className="rounded-lg bg-neutral-800 px-3 py-1.5 text-[13px] text-neutral-300"
              >
                やめる
              </button>
            </>
          ) : selectedBooth ? (
            <span className="text-[13px] text-emerald-300">
              図面の部屋を押すと「{selectedBooth.name}」の場所になります
            </span>
          ) : (
            <>
              <span className="text-[13px] text-neutral-400">
                ピンはドラッグで移動。↺ で部屋の中心に戻せます
              </span>
              {moved.length > 0 && (
                <button
                  onClick={() => setConfirmAllReset(true)}
                  className="rounded-lg border border-white/15 bg-neutral-900/75 px-3 py-1.5 text-[13px] text-neutral-200 hover:bg-neutral-800"
                >
                  このフロアの{moved.length}件を戻す
                </button>
              )}
            </>
          )}
        </div>
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
            // 運営画面は背景が暗いので、線を明るくしたダーク版の図面を使う
            src={floorplanSrc(area, currentFloor, true)}
            alt=""
            className="block w-full select-none"
            draggable={false}
          />

          {/* 部屋のあたり判定と部屋名。
              待ち時間や企画名はここには出さない。出してしまうと、下の企画ピンと
              同じ内容が二重に描かれ、ピンをドラッグしたときに「企画が2つに
              分かれた」ように見えてしまうため。企画の情報は企画ピンだけが持つ。 */}
          {rooms.map((room) => {
            const booth = boothByRoom.get(room.label);
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
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
                style={{ left: `${room.x}%`, top: `${room.y}%` }}
              >
                {/* 企画を選んでいるときだけ、押せる場所として枠を出す */}
                <span
                  className={`block h-9 w-9 rounded-full border-2 border-dashed transition ${
                    isTarget
                      ? "border-emerald-300 bg-emerald-400/30"
                      : selectedBooth
                        ? "border-neutral-400/70 bg-white/5 hover:bg-emerald-400/25"
                        : "border-transparent"
                  }`}
                />
                {/* 部屋名は教室の中心に置く。
                    企画が入っている部屋には企画ピンが同じ位置に立つので、
                    重ならないようにここでは出さない（名前はホバーで出る）。 */}
                {!booth && (
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-neutral-900/85 px-1.5 py-0.5 text-[12px] font-medium text-neutral-200 ring-1 ring-white/15">
                    {room.label}
                  </span>
                )}
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
                  setResetTarget(booth.id);
                }}
                title={`${booth.name}（ドラッグで移動／↺ で部屋の中心に戻す）`}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center active:cursor-grabbing ${
                  isDragging ? "z-30 scale-110" : "z-20"
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  // 企画を選んでいる間は「部屋を押して割り当てる」操作が主役。
                  // ピンがクリックを奪わないように通り抜けさせる。
                  pointerEvents: selectedBooth ? "none" : undefined,
                }}
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

                {/* 動かしたピンにだけ「部屋の中心に戻す」ボタンを出す。
                    iPadでは右クリックができないので、押せる形にしておく。 */}
                {(booth.pinX !== null || booth.pinY !== null) &&
                  !selectedBooth && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setResetTarget(booth.id);
                      }}
                      title="部屋の中心に戻す"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-neutral-900 text-[11px] leading-none text-white hover:bg-amber-400 hover:text-neutral-950"
                    >
                      ↺
                    </button>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
