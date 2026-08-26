"use client";

import { useCallback, useState } from "react";
import OverallTab from "@/components/organizer/OverallTab";
import BoothsTab from "@/components/organizer/BoothsTab";
import EventsTab from "@/components/organizer/EventsTab";
import StampsTab from "@/components/organizer/StampsTab";
import RefreshBar, { useLastUpdated } from "@/components/organizer/RefreshBar";

type Mode = "overall" | "booths" | "events" | "stamps";

const TABS: { key: Mode; label: string }[] = [
  { key: "overall", label: "全体運営" },
  { key: "booths", label: "企画運営" },
  { key: "events", label: "イベント運営" },
  { key: "stamps", label: "スタンプ" },
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

  // 広い画面（1024px以上）は1画面に収める。
  // それより狭いときは縦に積んで、ページごとスクロールして見られるようにする。
  return (
    <div className="flex min-h-screen flex-col px-4 pb-5 pt-4 text-white lg:h-screen lg:overflow-hidden lg:px-6">
      {/* 見出しとタブ、右上に更新ボタン */}
      <header className="mb-4 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/10 pb-3">
        <div className="leading-tight">
          <h1 className="text-[15px] font-medium tracking-[0.08em] text-neutral-100">
            渦潮祭
          </h1>
          <p className="text-[12px] tracking-[0.14em] text-neutral-500">
            ORGANIZER
          </p>
        </div>

        {/* スマホではタブを2段目に回して、幅いっぱいに並べる */}
        <div className="order-last flex w-full gap-2 sm:order-none sm:w-auto sm:flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={
                mode === t.key
                  ? "flex-1 whitespace-nowrap rounded-md border border-white/70 bg-white px-3 py-2 text-sm font-medium text-neutral-950 sm:flex-none sm:px-5"
                  : "flex-1 whitespace-nowrap rounded-md border border-white/15 px-3 py-2 text-sm text-neutral-400 transition-colors hover:border-white/30 hover:text-neutral-200 sm:flex-none sm:px-5"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto shrink-0">
          <RefreshBar lastUpdated={lastUpdated} onRefresh={refresh} />
        </div>
      </header>

      {/* 本体。ここだけが縦に伸び、はみ出す部分は各カードの中でスクロールする */}
      <main className="min-h-0 flex-1 pb-4 lg:pb-0">
        {mode === "overall" && (
          <OverallTab key={`overall-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
        {mode === "booths" && (
          <BoothsTab key={`booths-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
        {mode === "events" && (
          <EventsTab key={`events-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
        {mode === "stamps" && (
          <StampsTab key={`stamps-${reloadKey}`} onDataUpdate={onDataUpdate} />
        )}
      </main>
    </div>
  );
}
