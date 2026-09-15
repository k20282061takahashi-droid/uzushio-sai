"use client";

import { floorLabel, floorplanSrc, type AreaId } from "@/lib/floorplan";

// 建物を「階を重ねた立体」で見せる画面。
//
// なぜ作ったか
// ------------
// 平面図を1枚ずつ見る形だと、「自分がいる階の上下に何があるか」が分からない。
// 階を斜めに重ねて出すと、建物全体のかたちと、どの階に企画が多いかが一目で分かる。
//
// どうやって立体にしているか
// --------------------------
// 3Dの絵を描いているわけではなく、平面図（SVG）をブラウザの機能で
// 「傾けて・回して・高さをずらして」重ねているだけ。
// 図面を差し替えても、そのまま立体になる。

// 階と階のすき間（重ねる高さ）
const FLOOR_GAP = 78;
// 傾き。数字を大きくすると寝かせた見た目になる
const TILT_DEG = 56;
// 回転。建物を斜めから見るための角度
const TURN_DEG = -40;
// 傾けると横に広がるぶん、全体を少し縮めて画面に収める
const FIT_SCALE = 0.72;

// 傾けたときに、1つぶんの高さが画面の上下方向にどれだけ動くか。
// 階のラベルを図と同じ高さに並べるために使う。
const LABEL_STEP = FLOOR_GAP * Math.cos((TILT_DEG * Math.PI) / 180) * FIT_SCALE;

export default function IsoFloorStack({
  area,
  floors,
  activeFloor,
  boothCountByFloor,
  onSelectFloor,
  width,
  height,
}: {
  area: AreaId;
  /** 上の階から順に並んだ階の一覧 */
  floors: number[];
  activeFloor: number;
  /** 階ごとの企画の数。ラベルに出す */
  boothCountByFloor: Record<number, number>;
  onSelectFloor: (floor: number) => void;
  width: number;
  height: number;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* 立体に見せる部分 */}
      <div
        className="relative"
        style={{ width, height, perspective: "1600px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `scale(${FIT_SCALE}) rotateX(${TILT_DEG}deg) rotateZ(${TURN_DEG}deg)`,
          }}
        >
          {floors.map((floor, i) => {
            // 上の階ほど高い位置に置く（配列は上の階から並んでいる）
            const lift = (floors.length - 1 - i) * FLOOR_GAP;
            const active = floor === activeFloor;
            return (
              <div
                key={floor}
                onClick={() => onSelectFloor(floor)}
                className="absolute inset-0 cursor-pointer transition-opacity"
                style={{
                  transform: `translateZ(${lift}px)`,
                  opacity: active ? 1 : 0.55,
                }}
              >
                {/* 階の板。白い下地を敷くと、下の階が透けずに重なって見える */}
                <div
                  className="h-full w-full rounded-[6px] bg-white"
                  style={{
                    boxShadow: active
                      ? "0 0 0 3px var(--color-kosei-600)"
                      : "0 0 0 2px var(--color-kosei-300)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={floorplanSrc(area, floor)}
                    alt=""
                    draggable={false}
                    className="block h-full w-full select-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 階のボタン。押すとその階の平面図にうつる。
          立体の絵と同じ高さに並ぶよう、1つぶんの間隔を計算して置いている。 */}
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="relative w-full">
          {floors.map((floor, i) => {
            const active = floor === activeFloor;
            const count = boothCountByFloor[floor] ?? 0;
            // 真ん中を0として、上の階ほど上に置く
            const middle = (floors.length - 1) / 2;
            const offset = (i - middle) * LABEL_STEP;
            return (
              <button
                key={floor}
                onClick={() => onSelectFloor(floor)}
                className={`pointer-events-auto absolute left-0 flex -translate-y-1/2 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-heading text-sm font-black transition-transform active:scale-95 ${
                  active
                    ? "border-kosei-800 bg-kosei-600 text-white shadow-[0_3px_0_var(--color-kosei-800)]"
                    : "border-kosei-700 bg-white text-kosei-700 shadow-[0_3px_0_var(--color-kosei-700)]"
                }`}
                style={{ top: `calc(50% + ${offset}px)` }}
              >
                {floorLabel(floor)}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] ${
                      active ? "bg-white/25" : "bg-kosei-100 text-kosei-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
