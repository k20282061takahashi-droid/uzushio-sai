"use client";

import { useMemo, useState } from "react";
import DetailSheet from "@/components/DetailSheet";

const days = [
  { date: "9/19", label: "1日目" },
  { date: "9/20", label: "2日目" },
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

function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export default function TimelinePage() {
  const [dayIndex, setDayIndex] = useState(0);
  const [selected, setSelected] = useState<EventItem | null>(null);

  const events = eventsByDay[dayIndex];

  const { hourMarks, axisStart, totalHeight, venues } = useMemo(() => {
    const starts = events.map((e) => e.start);
    const ends = events.map((e) => e.end);
    const rangeStart = Math.floor(Math.min(...starts) / 60) * 60;
    const rangeEnd = Math.ceil(Math.max(...ends) / 60) * 60;
    const marks: number[] = [];
    for (let h = rangeStart; h <= rangeEnd; h += 60) marks.push(h);
    const uniqueVenues = Array.from(new Set(events.map((e) => e.venue)));
    return {
      hourMarks: marks,
      axisStart: rangeStart,
      totalHeight: (rangeEnd - rangeStart) * PX_PER_MIN,
      venues: uniqueVenues,
    };
  }, [events]);

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
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
