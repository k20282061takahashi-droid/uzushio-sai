"use client";

import { useState } from "react";
import DetailSheet from "@/components/DetailSheet";

const days = [
  { date: "9/19", label: "1日目" },
  { date: "9/20", label: "2日目" },
];

type EventItem = {
  time: string;
  title: string;
  venue: string;
  description: string;
};

const eventsByDay: EventItem[][] = [
  [
    { time: "9:00〜9:50", title: "吹奏楽部 演奏会", venue: "体育館", description: "吹奏楽部による定期演奏会。人気曲メドレーを予定。" },
    { time: "10:00〜10:50", title: "有志ダンス", venue: "体育館", description: "有志生徒によるダンスステージ。3チームが出演。" },
    { time: "11:00〜11:50", title: "軽音楽部 ライブ", venue: "体育館", description: "軽音楽部の各バンドによるライブステージ。" },
  ],
  [
    { time: "9:30〜10:10", title: "合唱部 発表会", venue: "体育館", description: "合唱部による合唱発表。全校合唱コーナーもあります。" },
    { time: "10:30〜11:30", title: "ダンス部 発表会", venue: "体育館", description: "ダンス部による最終日ステージ発表。" },
    { time: "13:00〜14:00", title: "有志コンテスト最終発表", venue: "体育館", description: "有志企画コンテストの結果発表・表彰式。" },
  ],
];

export default function TimelinePage() {
  const [dayIndex, setDayIndex] = useState(0);
  const [selected, setSelected] = useState<EventItem | null>(null);

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

      <ul className="space-y-3">
        {eventsByDay[dayIndex].map((ev, i) => (
          <li key={ev.title}>
            <button
              onClick={() => setSelected(ev)}
              className="animate-fade-in-up w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-transform active:scale-[0.98]"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <p className="text-xs text-zinc-400">
                {ev.time} ・ {ev.venue}
              </p>
              <p className="mt-1 text-lg font-bold">{ev.title}</p>
            </button>
          </li>
        ))}
      </ul>

      <DetailSheet open={selected != null} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <p className="mb-1 text-xs text-zinc-400">
              {selected.time} ・ {selected.venue}
            </p>
            <h2 className="mb-2 text-xl font-bold">{selected.title}</h2>
            <p className="text-sm text-zinc-300">{selected.description}</p>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
