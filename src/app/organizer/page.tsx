"use client";

import { useCallback, useState } from "react";
import OverallTab from "@/components/organizer/OverallTab";
import BoothsTab from "@/components/organizer/BoothsTab";
import EventsTab from "@/components/organizer/EventsTab";
import RefreshBar, { useLastUpdated } from "@/components/organizer/RefreshBar";

type Mode = "overall" | "booths" | "events";

const TABS: { key: Mode; label: string }[] = [
  { key: "overall", label: "全体運営" },
  { key: "booths", label: "企画運営" },
  { key: "events", label: "イベント運営" },
];

// 運営ダッシュボード。iPad・Macで開く前提で、横幅を使って
// 上下にスクロールしなくても一度に見渡せるようにしている。
export default function OrganizerPage() {
  const [mode, setMode] = useState<Mode>("overall");
  const { lastUpdated, mark } = useLastUpdated();
  // 「更新」を押したときに、各タブを作り直して読み込み直すための番号
  const [reloadKey, setReloadKey] = useState(0);

  const onDataUpdate = useCallback(() => mark(), [mark]);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
    mark();
  }, [mark]);

  return (
    <div className="flex h-screen flex-col overflow-hidden px-6 pb-5 pt-4 text-white">
      {/* 見出しとタブ、右上に更新ボタン */}
      <header className="mb-3 flex shrink-0 items-center gap-4">
        <div>
          <h1 className="text-sm font-bold text-slate-300">渦潮祭</h1>
          <p className="text-xs text-slate-500">運営用</p>
        </div>

        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={
                mode === t.key
                  ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
                  : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <RefreshBar lastUpdated={lastUpdated} onRefresh={refresh} />
        </div>
      </header>

      {/* 本体。ここだけが縦に伸び、はみ出す部分は各カードの中でスクロールする */}
      <main className="min-h-0 flex-1">
        {mode === "overall" && (
          <OverallTab key={`overall-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
        {mode === "booths" && (
          <BoothsTab key={`booths-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
        {mode === "events" && (
          <EventsTab key={`events-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
      </main>
    </div>
  );
}
