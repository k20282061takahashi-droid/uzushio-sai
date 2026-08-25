"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import { useNowMinutes } from "@/lib/nowLine";
import { todayInJapan } from "@/lib/visits";

// 開催日。fullDate は「今日かどうか」を判定するために使う。
const days = [
  { fullDate: "2026-09-19", date: "9/19", label: "1日目" },
  { fullDate: "2026-09-20", date: "9/20", label: "2日目" },
];

type EventItem = {
  start: number; // 開始（分, 0:00からの分数）
  end: number; // 終了（分）
  title: string;
  venue: string;
  description: string;
};

const eventsByDay: EventItem[][] = [
  [
    { start: 9 * 60, end: 9 * 60 + 50, title: "吹奏楽部 演奏会", venue: "体育館", description: "吹奏楽部による定期演奏会。人気曲メドレーを予定。" },
    { start: 10 * 60, end: 10 * 60 + 50, title: "有志ダンス", venue: "体育館", description: "有志生徒によるダンスステージ。3チームが出演。" },
    { start: 11 * 60, end: 11 * 60 + 50, title: "軽音楽部 ライブ", venue: "体育館", description: "軽音楽部の各バンドによるライブステージ。" },
  ],
  [
    { start: 9 * 60 + 30, end: 10 * 60 + 10, title: "合唱部 発表会", venue: "体育館", description: "合唱部による合唱発表。全校合唱コーナーもあります。" },
    { start: 10 * 60 + 30, end: 11 * 60 + 30, title: "ダンス部 発表会", venue: "体育館", description: "ダンス部による最終日ステージ発表。" },
    { start: 13 * 60, end: 14 * 60, title: "有志コンテスト最終発表", venue: "体育館", description: "有志企画コンテストの結果発表・表彰式。" },
  ],
];

const PX_PER_MIN = 1.8;
const TIMELINE_START = 9 * 60; // 9:00
const TIMELINE_END = 16 * 60; // 16:00

function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// 今日が開催日なら、その日を最初に開く
function initialDayIndex(): number {
  const today = todayInJapan();
  const index = days.findIndex((d) => d.fullDate === today);
  return index >= 0 ? index : 0;
}

export default function TimelinePage() {
  const [dayIndex, setDayIndex] = useState(initialDayIndex);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  const events = eventsByDay[dayIndex];

  // 表示している日が今日のときだけ、現在時刻の赤い線を出す
  const isToday = days[dayIndex]?.fullDate === todayInJapan();
  const nowMin = useNowMinutes(isToday);

  const { hourMarks, axisStart, totalHeight, venues } = useMemo(() => {
    const marks: number[] = [];
    for (let h = TIMELINE_START; h <= TIMELINE_END; h += 60) marks.push(h);
    const uniqueVenues = Array.from(new Set(events.map((e) => e.venue)));
    return {
      hourMarks: marks,
      axisStart: TIMELINE_START,
      totalHeight: (TIMELINE_END - TIMELINE_START) * PX_PER_MIN,
      venues: uniqueVenues,
    };
  }, [events]);

  // 開いたとき、現在時刻の線が画面の中央あたりに来るようにスクロールする
  useEffect(() => {
    if (scrolled.current || nowMin === null) return;
    if (nowMin < axisStart || nowMin > TIMELINE_END) return;
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
  }, [nowMin, axisStart]);

  // 赤い線を出す位置（時間の範囲の外なら出さない）
  const showNowLine =
    nowMin !== null && nowMin >= axisStart && nowMin <= TIMELINE_END;

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">
        タイムテーブル
      </h1>

      <div className="animate-fade-in-up mb-4 flex gap-2" style={{ animationDelay: "40ms" }}>
        {days.map((day, i) => (
          <button
            key={day.date}
            onClick={() => setDayIndex(i)}
            className={`flex-1 rounded-full border py-2 text-sm font-bold transition-transform active:scale-95 ${
              i === dayIndex
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-zinc-400"
            }`}
          >
            {day.label} {day.date}
          </button>
        ))}
      </div>

      {venues.length > 1 && (
        <div className="mb-2 flex text-center text-[11px] font-bold text-zinc-400">
          <div style={{ width: 40 }} />
          {venues.map((v) => (
            <div key={v} className="flex-1">
              {v}
            </div>
          ))}
        </div>
      )}

      <div className="animate-fade-in-up flex" style={{ animationDelay: "80ms" }}>
        {/* 時間軸 */}
        <div className="shrink-0" style={{ width: 40 }}>
          {hourMarks.map((h) => (
            <div key={h} style={{ height: 60 * PX_PER_MIN }} className="relative">
              <span className="absolute -top-2 right-1 text-[11px] text-zinc-500">
                {formatTime(h)}
              </span>
            </div>
          ))}
        </div>

        {/* イベントグリッド */}
        <div
          ref={gridRef}
          className="relative flex-1 rounded-lg border-l border-white/10"
          style={{ height: totalHeight }}
        >
          {hourMarks.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-white/10"
              style={{ top: (h - axisStart) * PX_PER_MIN }}
            />
          ))}

          {events.map((ev, i) => {
            const colIndex = venues.indexOf(ev.venue);
            const colWidth = 100 / venues.length;
            return (
              <button
                key={ev.title}
                onClick={() => setSelected(ev)}
                className="animate-fade-in-up absolute overflow-hidden rounded-lg border border-white/20 bg-white/10 p-2 text-left transition-transform active:scale-[0.97]"
                style={{
                  top: (ev.start - axisStart) * PX_PER_MIN + 1,
                  height: (ev.end - ev.start) * PX_PER_MIN - 2,
                  left: `${colIndex * colWidth}%`,
                  width: `${colWidth}%`,
                  animationDelay: `${80 + i * 40}ms`,
                }}
              >
                <p className="text-[10px] text-zinc-400">
                  {formatTime(ev.start)}〜{formatTime(ev.end)}
                </p>
                <p className="truncate text-sm font-bold">{ev.title}</p>
                {venues.length === 1 && (
                  <p className="text-[10px] text-zinc-500">@{ev.venue}</p>
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

      <DetailSheet open={selected != null} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <p className="mb-1 text-xs text-zinc-400">
              {formatTime(selected.start)}〜{formatTime(selected.end)} ・ {selected.venue}
            </p>
            <h2 className="mb-2 text-xl font-bold">{selected.title}</h2>
            <p className="text-sm text-zinc-300">{selected.description}</p>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
