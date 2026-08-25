"use client";

import Link from "next/link";

type Pt = [number, number];

function rawProj(gx: number, gy: number, gz: number): Pt {
  // 2:1アイソメトリック投影（スケール1、原点0基準）
  const x = gx - gy;
  const y = (gx + gy) * 0.5 - gz;
  return [x, y];
}

function toPoints(pts: Pt[]) {
  return pts.map((p) => p.join(",")).join(" ");
}

type Box = {
  id: string;
  name: string;
  gx: [number, number];
  gy: [number, number];
  h: number;
  congested?: boolean;
};

const boxes: Box[] = [
  { id: "gym", name: "体育館", gx: [0, 3], gy: [0, 1.4], h: 1.1, congested: true },
  { id: "junior", name: "中学棟", gx: [3.6, 5.0], gy: [0, 1.4], h: 1.1 },
  { id: "senior", name: "高校棟", gx: [0, 1.8], gy: [1.9, 3.5], h: 1.3, congested: true },
];

const ground: Box = {
  id: "schoolyard",
  name: "校庭",
  gx: [2.2, 5.0],
  gy: [1.9, 3.9],
  h: 0,
};

function faceCorners(b: Box) {
  const [gx0, gx1] = b.gx;
  const [gy0, gy1] = b.gy;
  const h = b.h;
  const top: [number, number, number][] = [
    [gx0, gy0, h],
    [gx1, gy0, h],
    [gx1, gy1, h],
    [gx0, gy1, h],
  ];
  const leftFront: [number, number, number][] = [
    [gx0, gy1, 0],
    [gx1, gy1, 0],
    [gx1, gy1, h],
    [gx0, gy1, h],
  ];
  const rightFront: [number, number, number][] = [
    [gx1, gy0, 0],
    [gx1, gy1, 0],
    [gx1, gy1, h],
    [gx1, gy0, h],
  ];
  return { top, leftFront, rightFront };
}

const VIEW_W = 620;
const VIEW_H = 340;
const PAD = 24;

export default function CampusMap() {
  // 1) 全形状の生座標(スケール1)を集める
  const allBoxes = [...boxes, ground];
  const rawAll: Pt[] = [];
  allBoxes.forEach((b) => {
    const { top, leftFront, rightFront } = faceCorners(b);
    [...top, ...(b.h > 0 ? [...leftFront, ...rightFront] : [])].forEach(
      ([gx, gy, gz]) => rawAll.push(rawProj(gx, gy, gz))
    );
  });
  const xs = rawAll.map((p) => p[0]);
  const ys = rawAll.map((p) => p[1]);
  const rawW = Math.max(...xs) - Math.min(...xs);
  const rawH = Math.max(...ys) - Math.min(...ys);
  const S = Math.min((VIEW_W - PAD * 2) / rawW, (VIEW_H - PAD * 2) / rawH);
  const OX = PAD - Math.min(...xs) * S + (VIEW_W - PAD * 2 - rawW * S) / 2;
  const OY = PAD - Math.min(...ys) * S + (VIEW_H - PAD * 2 - rawH * S) / 2;

  const proj = (gx: number, gy: number, gz: number): Pt => {
    const [rx, ry] = rawProj(gx, gy, gz);
    return [OX + rx * S, OY + ry * S];
  };

  const buildFaces = (b: Box) => {
    const c = faceCorners(b);
    return {
      top: c.top.map(([gx, gy, gz]) => proj(gx, gy, gz)),
      leftFront: c.leftFront.map(([gx, gy, gz]) => proj(gx, gy, gz)),
      rightFront: c.rightFront.map(([gx, gy, gz]) => proj(gx, gy, gz)),
    };
  };

  const groundTop = faceCorners(ground).top.map(([gx, gy, gz]) =>
    proj(gx, gy, gz)
  );

  function overallBbox(b: Box) {
    const faces = buildFaces(b);
    const pts = b.h > 0 ? [...faces.top, ...faces.leftFront, ...faces.rightFront] : faces.top;
    const xs2 = pts.map((p) => p[0]);
    const ys2 = pts.map((p) => p[1]);
    return {
      left: Math.min(...xs2),
      top: Math.min(...ys2),
      width: Math.max(...xs2) - Math.min(...xs2),
      height: Math.max(...ys2) - Math.min(...ys2),
    };
  }

  return (
    <div className="pressable relative w-full overflow-hidden rounded-3xl border-2 border-kosei-800 bg-kosei-700 shadow-[0_5px_0_var(--color-kosei-800)]">
      <p className="absolute left-3 top-2 z-20 text-[10px] text-kosei-200">
        ※ 校内図は仮モデル
      </p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block w-full"
        style={{ aspectRatio: `${VIEW_W}/${VIEW_H}` }}
      >
        <polygon
          points={toPoints(groundTop)}
          className="fill-kosei-500 stroke-kosei-800"
          strokeWidth={1.5}
        />
        {boxes.map((b) => {
          const { top, leftFront, rightFront } = buildFaces(b);
          return (
            <g key={b.id}>
              <polygon points={toPoints(leftFront)} className="fill-kosei-400 stroke-kosei-800" strokeWidth={1.5} />
              <polygon points={toPoints(rightFront)} className="fill-kosei-600 stroke-kosei-800" strokeWidth={1.5} />
              <polygon points={toPoints(top)} className="fill-kosei-100 stroke-kosei-800" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>

      {[...boxes, ground].map((b) => {
        const box = overallBbox(b);
        const labelTopPct = ((box.top + box.height * (b.h > 0 ? 0.6 : 0.5)) / VIEW_H) * 100;
        const labelLeftPct = ((box.left + box.width / 2) / VIEW_W) * 100;
        return (
          <Link
            key={b.id}
            href={`/map?area=${b.id}`}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-transform duration-150 ease-out active:scale-90"
            style={{ left: `${labelLeftPct}%`, top: `${labelTopPct}%` }}
          >
            <span className="whitespace-nowrap rounded-full border-2 border-kosei-800 bg-white px-2.5 py-0.5 font-heading text-[11px] font-bold text-kosei-800">
              {b.name}
            </span>
            {b.congested && (
              <span className="whitespace-nowrap rounded-full bg-accent-700 px-2 py-[1px] text-[9px] font-bold text-white">
                混雑中
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
