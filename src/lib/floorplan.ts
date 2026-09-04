// 校内図（平面図）と、その上の部屋の位置を扱うための共通処理。
//
// 図面: public/floorplans/{area}-{floor}.svg （体育館・校庭は floor なし）
// 部屋の座標: src/lib/floorplanRooms.json （scripts/generate-floorplans.mjs が生成）
//
// ※ 現在の図面はダミーです。本物の校内図をもらったら
//    public/floorplans/ のSVGと floorplanRooms.json を差し替えてください。
//    アプリ側のコードは変更不要です。

import rooms from "./floorplanRooms.json";
import ratios from "./floorplanRatios.json";

export type AreaId = "gym" | "senior" | "junior" | "schoolyard";

export type RoomPoint = {
  label: string;
  x: number; // 図面の横幅に対する % （0-100）
  y: number; // 図面の高さに対する % （0-100）
};

// 図面の縦横比。ピンの位置計算はこの比率を前提にしている。
export const FLOORPLAN_RATIO = "1200 / 800";

const roomIndex = rooms as Record<string, RoomPoint[]>;

// 階を持つエリアかどうか（体育館・校庭は平屋扱い）
export function hasFloors(area: AreaId): boolean {
  return area === "senior" || area === "junior";
}

// その棟で選べる階（上から順）。
// 地下があるのは中学棟だけ。高校棟にも地下はあるが、立ち入れず企画も無いので出さない。
const FLOORS_BY_AREA: Record<AreaId, number[]> = {
  senior: [4, 3, 2, 1],
  junior: [4, 3, 2, 1, -1],
  gym: [],
  schoolyard: [],
};

// 図面の縦横比（横 ÷ 縦）。
// ブラウザで測ると、SVGでは naturalWidth / naturalHeight の返る値が
// 環境によって違い（iPhoneのSafariで顕著）、図とピンの位置がまるごと
// ズレる原因になる。図面はこちらで用意するものなので、ファイルから
// 読み取って作った表を使う。表は scripts/make-dark-floorplans.mjs が作る。
const ratioIndex = ratios as Record<string, number>;

export function floorplanRatio(area: AreaId, floor?: number): number | null {
  return ratioIndex[keyFor(area, floor)] ?? null;
}

export function floorsFor(area: AreaId): number[] {
  return FLOORS_BY_AREA[area] ?? [];
}

// 階の見せ方（-1 は B1）
export function floorLabel(floor: number): string {
  return floor === -1 ? "B1" : `${floor}F`;
}

function keyFor(area: AreaId, floor?: number): string {
  return hasFloors(area) ? `${area}-${floor}` : area;
}

// 表示する図面ファイルのパス。
// dark を true にすると、暗い画面用に線を明るくした複製を返す。
// （運営画面は背景が黒に近く、黒い線の図面だと同化して見えないため）
// ダーク版は scripts/make-dark-floorplans.mjs が作っている。
export function floorplanSrc(
  area: AreaId,
  floor?: number,
  dark = false,
): string {
  const folder = dark ? "/floorplans/dark" : "/floorplans";
  return `${folder}/${keyFor(area, floor)}.svg`;
}

// その階にある部屋の一覧（企画を割り当てられる部屋のみ。階段・トイレは含まない）
export function roomsFor(area: AreaId, floor?: number): RoomPoint[] {
  return roomIndex[keyFor(area, floor)] ?? [];
}

// 部屋名から図面上の位置を引く。見つからなければ null。
export function roomCenter(
  area: AreaId,
  floor: number | undefined,
  label: string,
): RoomPoint | null {
  return roomsFor(area, floor).find((r) => r.label === label) ?? null;
}

// 運営が「場所」を選ぶときの選択肢を作るためのヘルパー。
// 例: [{ area: "senior", floor: 4, label: "3-A" }, ...]
export function allRoomOptions(): {
  area: AreaId;
  floor?: number;
  label: string;
}[] {
  const out: { area: AreaId; floor?: number; label: string }[] = [];
  for (const [key, list] of Object.entries(roomIndex)) {
    const [area, floorRaw] = key.split(/-(?=-?\d+$)/) as [AreaId, string?];
    for (const r of list) {
      out.push({
        area: (floorRaw ? area : (key as AreaId)),
        floor: floorRaw ? Number(floorRaw) : undefined,
        label: r.label,
      });
    }
  }
  return out;
}
