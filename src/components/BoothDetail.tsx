"use client";

import { useEffect, useState } from "react";
import { GENRE_LABELS, type Booth } from "@/lib/booth";
import { crowdLevelOfBooth } from "@/lib/boothPlacement";
import { openDayLabel } from "@/lib/boothGrouping";
import { crowdInfo } from "@/lib/waitColor";
import { loadSignboard } from "@/lib/signboard";

// 地図のピンを押したときに下から出てくるカードの中身。
// 出す順番：場所 → クラス名 → 企画名 → 混雑のぐあい → 写真 → 詳細説明
export default function BoothDetail({ booth }: { booth: Booth }) {
  const level = crowdLevelOfBooth(booth);

  // 看板画像は企画データとは別に置いてあるので、このカードを開いたときだけ読む。
  // こうしないと、地図に出す企画一覧に全部の画像がぶら下がって重くなる。
  const [signboard, setSignboard] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = booth.hasSignboard
      ? loadSignboard(booth.id)
      : Promise.resolve(null);
    load
      .then((url) => {
        if (alive) setSignboard(url);
      })
      .catch(() => {
        // 画像が出せなくても、他の情報は読めるようにしておく
        if (alive) setSignboard(null);
      });
    return () => {
      alive = false;
    };
  }, [booth.id, booth.hasSignboard]);

  const place = [
    booth.location,
    booth.floor !== null ? (booth.floor === -1 ? "B1" : `${booth.floor}F`) : null,
    booth.roomName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {/* 場所 */}
      {place && (
        <p className="mb-1 text-xs font-bold text-kosei-600">{place}</p>
      )}

      {/* クラス名（団体名） */}
      <p className="text-sm font-bold text-kosei-600">{booth.name}</p>

      {/* 企画名 */}
      <h2 className="mb-3 font-heading text-2xl font-black leading-tight text-kosei-800">
        {booth.projectName || "（企画名は準備中）"}
      </h2>

      {/* 状態と待ち時間 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {booth.status === "closed" ? (
          <span className="rounded-full bg-inkgray-400 px-3 py-1 text-sm font-bold text-white">
            終了しました
          </span>
        ) : booth.status === "break" ? (
          <span className="rounded-full bg-warn-600 px-3 py-1 text-sm font-bold text-white">
            休憩中
          </span>
        ) : level !== null ? (
          <span
            className="rounded-full px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: crowdInfo(level).color }}
          >
            {crowdInfo(level).label}
          </span>
        ) : booth.hasWaiting ? (
          // 混雑を出す企画だが、まだ一度も入力されていない。
          // 「空いている」と勘違いされないよう、分からないことをそのまま書く。
          <span className="rounded-full bg-inkgray-400 px-3 py-1 text-sm font-bold text-white">
            混雑は確認中
          </span>
        ) : (
          <span className="rounded-full bg-success-600 px-3 py-1 text-sm font-bold text-white">
            開催中
          </span>
        )}

        {/* 片方の日しかやらない企画は、混雑の表示のとなりに出す */}
        {openDayLabel(booth) && (
          <span className="rounded-full border-2 border-warn-800 px-3 py-1 text-sm font-bold text-warn-800">
            {openDayLabel(booth)}
          </span>
        )}

        {booth.genre && (
          <span className="rounded-full border-2 border-kosei-300 px-3 py-1 text-sm font-bold text-kosei-700">
            {GENRE_LABELS[booth.genre]}
          </span>
        )}
      </div>

      {/* 写真（看板画像） */}
      {signboard && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signboard}
          alt={booth.projectName || booth.name}
          className="mb-3 max-h-52 w-full rounded-2xl border-2 border-kosei-200 object-cover"
        />
      )}

      {/* 詳細説明 */}
      {booth.description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-kosei-800">
          {booth.description}
        </p>
      ) : (
        <p className="text-sm text-kosei-500">説明は準備中です</p>
      )}
    </div>
  );
}
