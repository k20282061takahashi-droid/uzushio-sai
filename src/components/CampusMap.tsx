"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribeVisitorBooths, type Booth } from "@/lib/booth";
import { AREA_NAMES, crowdLevelOfBooth } from "@/lib/boothPlacement";
import { type AreaId } from "@/lib/floorplan";

// ホーム画面の校内図。
//
// 2026-09-15：手で組み立てた立体の箱から、本物の校内図（SVG）に差し替えた。
// 図は public/floorplans/campus.svg。建物の名前は図の中に書かれているので、
// ここでは「押せる場所」と「今の混みぐあい」だけを図の上に重ねている。
//
// 図を新しいものに差し替えるときは
//   1. public/floorplans/campus.svg を置き換える
//   2. 図の縦横比が変わったら VIEW_W / VIEW_H を直す
//   3. 建物の位置が変わったら、下の AREAS の数字（％）を直す
// の3つだけで済む。

// 図の中の座標系（SVGの viewBox と同じ）
const VIEW_W = 770;
const VIEW_H = 390;

// 押せる場所。図の上での位置を、図の横幅・高さに対する％で持つ。
// 建物どうしが少しだけ重なっているところは、押し間違えないように離してある。
type Hotspot = {
  id: AreaId;
  name: string;
  /** 図の左上を0とした％ */
  left: number;
  top: number;
  width: number;
  height: number;
  /** 地図ではなく別の画面へ送る場所（校庭はタイムテーブルへ） */
  goTo?: string;
};

const AREAS: Hotspot[] = [
  { id: "gym", name: "体育館", left: 15.7, top: 3.3, width: 38.0, height: 29.7 },
  { id: "senior", name: "高校棟", left: 2.9, top: 36.0, width: 28.2, height: 28.9 },
  { id: "junior", name: "中学棟", left: 56.1, top: 19.3, width: 30.8, height: 46.6 },
  {
    id: "schoolyard",
    name: "校庭",
    left: 34.2,
    top: 70.0,
    width: 43.6,
    height: 23.8,
    goTo: "/timeline",
  },
];

// この段階以上を「混んでいる」とみなす（4＝並ぶかも、5＝結構並ぶ）
const BUSY_LEVEL = 4;

type AreaState = { count: number; busy: boolean };

export default function CampusMap() {
  const [booths, setBooths] = useState<Booth[]>([]);
  useEffect(() => subscribeVisitorBooths(setBooths), []);

  // 建物ごとに「企画がいくつあるか」「混んでいるか」を数える。
  //
  // 混んでいるかどうかは、1つでも混んでいれば混雑、とはしない。
  // 57ある企画のうち1つが混んでいるだけで建物全体が「混雑中」に見えると、
  // 来場者はその建物を避けてしまい、かえって混み方がかたよるため。
  // 「混みぐあいを出している企画のうち、半分以上が混んでいる」ときだけ出す。
  const stateByArea = new Map<AreaId, AreaState>();
  for (const area of AREAS) {
    const areaName = AREA_NAMES[area.id];
    const inArea = booths.filter(
      (b) => b.location === areaName && b.status !== "closed",
    );
    const levels = inArea
      .map((b) => crowdLevelOfBooth(b))
      .filter((l): l is NonNullable<typeof l> => l !== null);
    const busyCount = levels.filter((l) => l >= BUSY_LEVEL).length;
    stateByArea.set(area.id, {
      count: inArea.length,
      busy: levels.length >= 2 && busyCount * 2 >= levels.length,
    });
  }

  return (
    // カードは正方形。上半分が校内図、下半分が建物の一覧。
    // 図だけだと押せる場所が分かりにくく、指も入りづらいので、
    // 下に「押すための行」を用意して、どちらからでも行けるようにしている。
    <div className="relative w-full overflow-hidden rounded-3xl border-2 border-kosei-800 bg-white shadow-[0_5px_0_var(--color-kosei-800)]">
      <div className="flex w-full flex-col" style={{ aspectRatio: "1 / 1" }}>
        {/* 上：校内図。建物の名前は図の中に書かれている。 */}
        <div
          className="relative w-full shrink-0"
          style={{ aspectRatio: `${VIEW_W}/${VIEW_H}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/floorplans/campus.svg"
            alt="校内の全体図。体育館・高校棟・中学棟・校庭があります"
            draggable={false}
            className="block w-full select-none"
            style={{ aspectRatio: `${VIEW_W}/${VIEW_H}` }}
          />

          {AREAS.map((area) => {
            const state = stateByArea.get(area.id);
            return (
              <Link
                key={area.id}
                href={area.goTo ?? `/map?area=${area.id}`}
                aria-label={
                  area.goTo
                    ? `${area.name}のイベントを見る`
                    : `${area.name}の地図を見る`
                }
                className="absolute flex flex-col items-center justify-end gap-1 rounded-2xl pb-1 transition-all duration-150 ease-out hover:bg-kosei-800/5 active:scale-95 active:bg-kosei-800/10"
                style={{
                  left: `${area.left}%`,
                  top: `${area.top}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                }}
              >
                {state?.busy && (
                  <span className="whitespace-nowrap rounded-full bg-accent-700 px-2 py-[1px] text-[10px] font-bold text-white shadow">
                    混雑中
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* 下：建物の一覧。図の下にできた場所を使って、指で押しやすい行にする。 */}
        <ul className="flex min-h-0 flex-1 flex-col justify-evenly border-t-2 border-kosei-200 px-2 py-1">
          {AREAS.map((area) => {
            const state = stateByArea.get(area.id);
            return (
              <li key={area.id} className="min-h-0">
                <Link
                  href={area.goTo ?? `/map?area=${area.id}`}
                  className="pressable flex items-center gap-2 rounded-2xl px-2 py-1.5"
                >
                  <span className="font-heading text-sm font-black text-kosei-800">
                    {area.name}
                  </span>
                  {state?.busy && (
                    <span className="whitespace-nowrap rounded-full bg-accent-700 px-2 py-[1px] text-[10px] font-bold text-white">
                      混雑中
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-kosei-600">
                    {area.goTo
                      ? "イベントを見る"
                      : state && state.count > 0
                        ? `企画 ${state.count}件`
                        : "地図を見る"}
                    <span aria-hidden className="text-kosei-500">
                      ↗
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
