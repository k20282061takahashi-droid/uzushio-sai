const days = [
  { date: "9/19", label: "1日目" },
  { date: "9/20", label: "2日目" },
];

const events = [
  { time: "9:00〜9:50", title: "吹奏楽部 演奏会", venue: "体育館" },
  { time: "10:00〜10:50", title: "有志ダンス", venue: "体育館" },
  { time: "11:00〜11:50", title: "軽音楽部 ライブ", venue: "体育館" },
];

export default function TimelinePage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">
        タイムテーブル
      </h1>

      <div className="animate-fade-in-up mb-4 flex gap-2" style={{ animationDelay: "40ms" }}>
        {days.map((day, i) => (
          <button
            key={day.date}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-transform active:scale-95 ${
              i === 0 ? "bg-sky-500/30 text-sky-300" : "bg-white/5 text-slate-400"
            }`}
          >
            {day.label} {day.date}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {events.map((ev, i) => (
          <li
            key={ev.title}
            className="animate-fade-in-up rounded-2xl border border-white/10 bg-white/5 p-4 transition-transform active:scale-[0.98]"
            style={{ animationDelay: `${80 + i * 40}ms` }}
          >
            <p className="text-xs text-slate-400">
              {ev.time} ・ {ev.venue}
            </p>
            <p className="mt-1 text-lg font-bold">{ev.title}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
