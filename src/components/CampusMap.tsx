"use client";

import Link from "next/link";
import { useState } from "react";

type Rect = { top: string; left: string; width: string; height: string };

type Area = {
  id: string;
  name: string;
  congested?: boolean;
  buttonStyle: Rect;
  tone: string;
};

// 校庭は建物の後ろに広がる地面レイヤー（クリック不可・見た目のみ）
const groundStyle: Rect = { top: "38%", left: "0%", width: "100%", height: "62%" };

const areas: Area[] = [
  {
    id: "gym",
    name: "体育館",
    congested: true,
    buttonStyle: { top: "4%", left: "14%", width: "72%", height: "30%" },
    tone: "bg-indigo-900/60 border-indigo-400/30",
  },
  {
    id: "senior",
    name: "高校棟",
    congested: true,
    buttonStyle: { top: "42%", left: "4%", width: "42%", height: "38%" },
    tone: "bg-indigo-900/60 border-indigo-400/30",
  },
  {
    id: "junior",
    name: "中学棟",
    buttonStyle: { top: "42%", left: "54%", width: "42%", height: "38%" },
    tone: "bg-indigo-900/60 border-indigo-400/30",
  },
  {
    id: "schoolyard",
    name: "校庭",
    // 建物の隙間（下部中央の空きスペース）に重ならないよう配置
    buttonStyle: { top: "84%", left: "30%", width: "40%", height: "13%" },
    tone: "bg-emerald-900/50 border-emerald-400/30",
  },
];

export default function CampusMap() {
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
      <p className="absolute left-2 top-1 z-20 text-[10px] text-slate-500">
        ※ 校内図は仮配置（3Dイラスト差し替え予定）
      </p>
      {/* 校庭：地面レイヤー（背景のみ） */}
      <div
        className="absolute rounded-xl bg-emerald-900/20"
        style={groundStyle}
      />
      {areas.map((area) => (
        <Link
          key={area.id}
          href={`/map?area=${area.id}`}
          onPointerDown={() => setPressed(area.id)}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          className={`absolute z-10 flex flex-col items-center justify-center rounded-xl border text-center transition-transform duration-150 ease-out active:scale-95 ${area.tone} ${
            pressed === area.id ? "scale-95" : ""
          }`}
          style={area.buttonStyle}
        >
          <span className="text-sm font-bold sm:text-base">{area.name}</span>
          {area.congested && (
            <span className="mt-0.5 rounded-full bg-red-500/30 px-1.5 py-0 text-[10px] text-red-200">
              混雑中
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
