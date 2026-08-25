// 企画データを、校内図の上に置ける形（座標つき）に変換する処理。
//
// 位置の決め方は2段階：
//   1. 運営が地図上でドラッグして決めた座標（pinX / pinY）があればそれを使う
//   2. 無ければ、部屋名（roomName）から図面上の中心位置を引く
// これにより、本物の校内図に差し替えても部屋名が同じなら位置は保たれる。

import type { Booth } from "./booth";
import { roomCenter, hasFloors, type AreaId } from "./floorplan";

export type PlacedBooth = Booth & { x: number; y: number };

// 図面のエリアIDと、企画データの「場所」の名前の対応
export const AREA_NAMES: Record<AreaId, string> = {
  senior: "高校棟",
  junior: "中学棟",
  gym: "体育館",
  schoolyard: "校庭",
};

// 待ち時間（分）。待ち時間を使わない企画は null。
export function waitMinutesOfBooth(booth: Booth): number | null {
  if (!booth.hasWaiting || !booth.timePerGroup) return null;
  return (booth.waitingGroups ?? 0) * booth.timePerGroup;
}

// そのエリア・階に置く企画を、座標つきで返す
export function placeBooths(
  booths: Booth[],
  area: AreaId,
  floor?: number,
): PlacedBooth[] {
  const areaName = AREA_NAMES[area];
  const placed: PlacedBooth[] = [];

  for (const booth of booths) {
    if (booth.location !== areaName) continue;
    if (hasFloors(area) && booth.floor !== floor) continue;

    // 1) 運営がドラッグで決めた位置
    if (booth.pinX !== null && booth.pinY !== null) {
      placed.push({ ...booth, x: booth.pinX, y: booth.pinY });
      continue;
    }
    // 2) 部屋名から引く
    if (booth.roomName) {
      const point = roomCenter(area, floor, booth.roomName);
      if (point) placed.push({ ...booth, x: point.x, y: point.y });
    }
  }

  return placed;
}
