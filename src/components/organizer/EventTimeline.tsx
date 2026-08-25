"use client";

import { useEffect, useRef, useState } from "react";
import type { FestivalEvent } from "@/lib/booth";

// Appleのカレンダーのような、時間軸に沿ってイベントを並べる表示。
// ・拡大／縮小できる
// ・今の時刻に赤い線が入る

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

// 1分あたりの高さ（px）。拡大縮小するとこの値が変わる。
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;

// "9:30" のような文字列を、0時からの分数に直す
export function parseTime(text: string | null): number | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,2})[:：](\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// 日本時間での「今」を、0時からの分数で返す
function nowMinutesInJapan(): number {
  const text = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
}

export default function EventTimeline({
  events,
  showNowLine,
  onSelect,
  selectedId,
}: {
  events: FestivalEvent[];
  showNowLine: boolean;
  onSelect?: (event: FestivalEvent) => void;
  selectedId?: string | null;
}) {
  const [zoom, setZoom] = useState(1.6);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 現在時刻の赤線を1分ごとに動かす
  useEffect(() => {
    const update = () =>
      setNowMin(showNowLine ? nowMinutesInJapan() : null);
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [showNowLine]);

  // 表示する時間の範囲。イベントがはみ出す場合は自動で広げる
  const times = events
    .flatMap((e) => [parseTime(e.startAt), parseTime(e.endAt)])
    .filter((v): v is number => v !== null);
  const startHour = Math.min(
    DEFAULT_START_HOUR,
    times.length ? Math.floor(Math.min(...times) / 60) : DEFAULT_START_HOUR,
  );
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    times.length ? Math.ceil(Math.max(...times) / 60) : DEFAULT_END_HOUR,
  );

  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const totalHeight = (rangeEnd - rangeStart) * zoom;

  const hourMarks: number[] = [];
  for (let h = startHour; h <= endHour; h++) hourMarks.push(h * 60);

  return (
    <div className="flex h-full flex-col">
      {/* 拡大縮小 */}
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <span className="text-[13px] text-slate-400">表示の細かさ</span>
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.3))}
          className="rounded-md bg-white/10 px-2.5 py-1 text-xs active:scale-95"
        >
          −
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.3))}
          className="rounded-md bg-white/10 px-2.5 py-1 text-xs active:scale-95"
        >
          ＋
        </button>
        <button
          onClick={() => setZoom(1.6)}
          className="rounded-md bg-white/5 px-3 py-1.5 text-[13px] text-slate-400 active:scale-95"
        >
          標準に戻す
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40"
      >
        <div className="flex px-2 py-2">
          {/* 時刻の目盛り */}
          <div className="w-12 shrink-0">
            {hourMarks.map((m) => (
              <div key={m} style={{ height: 60 * zoom }} className="relative">
                <span className="absolute -top-2 right-2 text-[13px] text-slate-400">
                  {formatMinutes(m)}
                </span>
              </div>
            ))}
          </div>

          {/* イベントを並べる面 */}
          <div
            className="relative flex-1 border-l border-white/10"
            style={{ height: totalHeight }}
          >
            {/* 1時間ごとの線 */}
            {hourMarks.map((m) => (
              <div
                key={m}
                className="absolute inset-x-0 border-t border-white/10"
                style={{ top: (m - rangeStart) * zoom }}
              />
            ))}
            {/* 30分ごとの薄い線 */}
            {hourMarks.slice(0, -1).map((m) => (
              <div
                key={`half-${m}`}
                className="absolute inset-x-0 border-t border-dashed border-white/5"
                style={{ top: (m + 30 - rangeStart) * zoom }}
              />
            ))}

            {/* イベント */}
            {events.map((e) => {
              const start = parseTime(e.startAt);
              const end = parseTime(e.endAt);
              if (start === null) return null;
              const height = Math.max(
                24,
                ((end ?? start + 30) - start) * zoom - 2,
              );
              const cancelled = e.status === "cancelled";
              const isSelected = selectedId === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => onSelect?.(e)}
                  className={`absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1 text-left transition-colors ${
                    cancelled
                      ? "border-white/10 bg-white/5 opacity-50"
                      : e.delayed
                        ? "border-amber-400/50 bg-amber-400/15"
                        : "border-sky-400/40 bg-sky-400/15"
                  } ${isSelected ? "ring-2 ring-white/60" : ""}`}
                  style={{ top: (start - rangeStart) * zoom + 1, height }}
                >
                  {/* 高さが足りないときは、時刻と名前を1行にまとめて表示する */}
                  {height < 44 ? (
                    <p className="flex items-center gap-2 truncate text-xs">
                      <span className="shrink-0 text-[13px] text-slate-300">
                        {formatMinutes(start)}
                        {end !== null && `〜${formatMinutes(end)}`}
                      </span>
                      <span className="truncate font-bold">
                        {e.name || "（名前未設定）"}
                      </span>
                      {e.delayed && (
                        <span className="shrink-0 text-[12px] text-amber-300">
                          遅延
                        </span>
                      )}
                      {cancelled && (
                        <span className="shrink-0 text-[12px] text-red-300">
                          中止
                        </span>
                      )}
                    </p>
                  ) : (
                    <>
                      <p className="truncate text-[13px] text-slate-300">
                        {formatMinutes(start)}
                        {end !== null && `〜${formatMinutes(end)}`}
                        {e.delayed && (
                          <span className="ml-1 text-amber-300">遅延</span>
                        )}
                        {cancelled && (
                          <span className="ml-1 text-red-300">中止</span>
                        )}
                      </p>
                      <p className="truncate text-sm font-bold">
                        {e.name || "（名前未設定）"}
                      </p>
                    </>
                  )}
                </button>
              );
            })}

            {/* 現在時刻の赤線 */}
            {nowMin !== null && nowMin >= rangeStart && nowMin <= rangeEnd && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: (nowMin - rangeStart) * zoom }}
              >
                <span className="-ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <span className="h-px flex-1 bg-red-500" />
                <span className="ml-1 shrink-0 rounded bg-red-500 px-1 text-[12px] font-bold text-white">
                  {formatMinutes(nowMin)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
