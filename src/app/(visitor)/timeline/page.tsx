"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import {
  subscribeEvents,
  subscribeFestivalDays,
  type FestivalEvent,
} from "@/lib/booth";
import { useNowMinutes } from "@/lib/nowLine";
import { todayInJapan } from "@/lib/visits";

const PX_PER_MIN = 1.8;
const DEFAULT_START = 9 * 60; // 9:00
const DEFAULT_END = 16 * 60; // 16:00

function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// "10:30" のような文字列を、0:00からの分数に直す
function toMinutes(text: string | null): number | null {
  if (!text) return null;
  const [h, m] = text.split(/[:：]/).map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

// 日付を「9/19」の形にする
function dayLabel(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${Number(month)}/${Number(day)}` : date;
}

export default function TimelinePage() {
  const [days, setDays] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<FestivalEvent[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);
  const pickedInitialDay = useRef(false);

  useEffect(() => subscribeFestivalDays(setDays), []);
  useEffect(() => subscribeEvents(setAllEvents), []);

  // 今日が開催日なら、その日を最初に開く
  useEffect(() => {
    if (pickedInitialDay.current || days.length === 0) return;
    pickedInitialDay.current = true;
    const index = days.indexOf(todayInJapan());
    if (index > 0) {
      const timer = setTimeout(() => setDayIndex(index), 0);
      return () => clearTimeout(timer);
    }
  }, [days]);

  const currentDay = days[dayIndex] ?? "";

  // その日のイベントを開始時刻の順に並べる
  const events = useMemo(
    () =>
      allEvents
        .filter((e) => e.day === currentDay && toMinutes(e.startAt) !== null)
        .sort(
          (a, b) => (toMinutes(a.startAt) ?? 0) - (toMinutes(b.startAt) ?? 0),
        ),
    [allEvents, currentDay],
  );

  // 表示する時間の幅は、その日のイベントに合わせて自動で決める
  const { axisStart, axisEnd, hourMarks, venues } = useMemo(() => {
    let min = DEFAULT_START;
    let max = DEFAULT_END;
    for (const e of events) {
      const s = toMinutes(e.startAt);
      const en = toMinutes(e.endAt) ?? (s !== null ? s + 60 : null);
      if (s !== null) min = Math.min(min, Math.floor(s / 60) * 60);
      if (en !== null) max = Math.max(max, Math.ceil(en / 60) * 60);
    }
    const marks: number[] = [];
    for (let h = min; h <= max; h += 60) marks.push(h);
    const uniqueVenues = Array.from(
      new Set(events.map((e) => e.venue || "会場未定")),
    );
    return {
      axisStart: min,
      axisEnd: max,
      hourMarks: marks,
      venues: uniqueVenues.length > 0 ? uniqueVenues : ["会場未定"],
    };
  }, [events]);

  const totalHeight = (axisEnd - axisStart) * PX_PER_MIN;

  // 表示している日が今日のときだけ、現在時刻の赤い線を出す
  const isToday = currentDay === todayInJapan();
  const nowMin = useNowMinutes(isToday);

  // 開いたとき、現在時刻の線が画面の中央あたりに来るようにスクロールする
  useEffect(() => {
    if (scrolled.current || nowMin === null) return;
    if (nowMin < axisStart || nowMin > axisEnd) return;
    const el = gridRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const lineY = rect.top + window.scrollY + (nowMin - axisStart) * PX_PER_MIN;
      window.scrollTo({
        top: Math.max(0, lineY - window.innerHeight / 2),
        behavior: "smooth",
      });
      scrolled.current = true;
    }, 120);
    return () => clearTimeout(timer);
  }, [nowMin, axisStart, axisEnd]);

  const showNowLine =
    nowMin !== null && nowMin >= axisStart && nowMin <= axisEnd;

  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-8">
      <h1 className="animate-fade-in-up mb-4 font-heading text-2xl font-black text-kosei-800">
        タイムテーブル
      </h1>

      {days.length > 1 && (
        <div
          className="animate-fade-in-up mb-4 flex gap-2"
          style={{ animationDelay: "40ms" }}
        >
          {days.map((day, i) => (
            <button
              key={day}
              onClick={() => setDayIndex(i)}
              className={`pressable flex-1 rounded-full border-2 py-2 font-heading text-sm font-black ${
                i === dayIndex
                  ? "border-kosei-800 bg-kosei-600 text-white shadow-[0_3px_0_var(--color-kosei-800)]"
                  : "border-kosei-700 bg-white text-kosei-700 shadow-[0_3px_0_var(--color-kosei-700)]"
              }`}
            >
              {i + 1}日目 {dayLabel(day)}
            </button>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-kosei-600">
          この日のイベントはまだ登録されていません
        </p>
      ) : (
        <>
          {venues.length > 1 && (
            <div className="mb-2 flex text-center text-xs font-bold text-kosei-600">
              <div style={{ width: 40 }} />
              {venues.map((v) => (
                <div key={v} className="flex-1">
                  {v}
                </div>
              ))}
            </div>
          )}

          <div
            className="animate-fade-in-up flex"
            style={{ animationDelay: "80ms" }}
          >
            {/* 時間軸 */}
            <div className="shrink-0" style={{ width: 40 }}>
              {hourMarks.map((h) => (
                <div
                  key={h}
                  style={{ height: 60 * PX_PER_MIN }}
                  className="relative"
                >
                  <span className="absolute -top-2 right-1 text-xs font-bold text-kosei-500">
                    {formatTime(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* イベントの枠 */}
            <div
              ref={gridRef}
              className="relative flex-1 rounded-lg border-l-2 border-kosei-200"
              style={{ height: totalHeight }}
            >
              {hourMarks.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t-2 border-kosei-100"
                  style={{ top: (h - axisStart) * PX_PER_MIN }}
                />
              ))}

              {events.map((ev, i) => {
                const start = toMinutes(ev.startAt) ?? axisStart;
                const end = toMinutes(ev.endAt) ?? start + 50;
                const colIndex = venues.indexOf(ev.venue || "会場未定");
                const colWidth = 100 / venues.length;
                const cancelled = ev.status === "cancelled";
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    className={`animate-fade-in-up absolute overflow-hidden rounded-xl border-2 p-2 text-left transition-transform active:scale-[0.97] ${
                      cancelled
                        ? "border-inkgray-400 bg-inkgray-50"
                        : ev.delayed
                          ? "border-warn-800 bg-warn-50"
                          : "border-kosei-700 bg-white"
                    }`}
                    style={{
                      top: (start - axisStart) * PX_PER_MIN + 1,
                      height: Math.max(28, (end - start) * PX_PER_MIN - 2),
                      left: `${colIndex * colWidth}%`,
                      width: `${colWidth}%`,
                      animationDelay: `${80 + i * 40}ms`,
                    }}
                  >
                    <p className="text-[10px] font-bold text-kosei-600">
                      {formatTime(start)}〜{formatTime(end)}
                    </p>
                    <p className="truncate font-heading text-sm font-black text-kosei-800">
                      {ev.name || "（名称未定）"}
                    </p>
                    {cancelled && (
                      <p className="text-[10px] font-bold text-danger-800">
                        中止
                      </p>
                    )}
                    {!cancelled && ev.delayed && (
                      <p className="text-[10px] font-bold text-warn-800">
                        開始遅れ
                      </p>
                    )}
                  </button>
                );
              })}

              {/* 現在時刻の赤い線 */}
              {showNowLine && nowMin !== null && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: (nowMin - axisStart) * PX_PER_MIN }}
                >
                  <span className="-ml-1.5 h-3 w-3 shrink-0 rounded-full bg-red-500" />
                  <span className="h-[2px] flex-1 bg-red-500" />
                  <span className="ml-1 shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {formatTime(nowMin)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <DetailSheet open={selected != null} onClose={() => setSelectedId(null)}>
        {selected && (
          <div>
            {/* 開始時間・終了時間 */}
            <p className="mb-1 text-sm font-bold text-kosei-600">
              {formatTime(toMinutes(selected.startAt) ?? 0)}
              {selected.endAt && `〜${formatTime(toMinutes(selected.endAt)!)}`}
              {selected.venue && ` ・ ${selected.venue}`}
            </p>

            {/* 名前 */}
            <h2 className="font-heading text-2xl font-black leading-tight text-kosei-800">
              {selected.name || "（名称未定）"}
            </h2>

            {/* 連絡（中止・遅れ）。無いときは何も出さない */}
            {selected.status === "cancelled" && (
              <p className="mt-3 rounded-xl border-2 border-danger-800 bg-danger-50 p-3 text-sm font-bold text-danger-800">
                このイベントは中止になりました
              </p>
            )}
            {selected.status !== "cancelled" && selected.delayed && (
              <p className="mt-3 rounded-xl border-2 border-warn-800 bg-warn-50 p-3 text-sm font-bold text-warn-800">
                開始時間が遅れています
                {selected.originalStartAt && (
                  <>
                    <br />
                    <span className="font-normal">
                      もとの予定 {selected.originalStartAt} →{" "}
                      {selected.startAt} 開始
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
