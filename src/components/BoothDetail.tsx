"use client";

import { GENRE_LABELS, type Booth } from "@/lib/booth";
import { waitMinutesOfBooth } from "@/lib/boothPlacement";
import { waitColor } from "@/lib/waitColor";

// 地図のピンを押したときに下から出てくるカードの中身。
// 出す順番：場所 → クラス名 → 企画名 → 待ち時間 → 写真 → 詳細説明
export default function BoothDetail({ booth }: { booth: Booth }) {
  const minutes = waitMinutesOfBooth(booth);
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
        ) : minutes !== null ? (
          <span
            className="rounded-full px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: waitColor(minutes) }}
          >
            待ち時間 約{minutes}分
          </span>
        ) : (
          <span className="rounded-full bg-success-600 px-3 py-1 text-sm font-bold text-white">
            開催中
          </span>
        )}

        {booth.genre && (
          <span className="rounded-full border-2 border-kosei-300 px-3 py-1 text-sm font-bold text-kosei-700">
            {GENRE_LABELS[booth.genre]}
          </span>
        )}
      </div>

      {/* 写真（看板画像） */}
      {booth.signboardUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={booth.signboardUrl}
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
