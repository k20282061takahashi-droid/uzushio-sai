"use client";

import { useCallback, useState, type SVGProps } from "react";
import OverallTab from "@/components/organizer/OverallTab";
import BoothsTab from "@/components/organizer/BoothsTab";
import EventsTab from "@/components/organizer/EventsTab";
import StampsTab from "@/components/organizer/StampsTab";
import RefreshBar, { useLastUpdated } from "@/components/organizer/RefreshBar";

type Mode = "overall" | "booths" | "events" | "stamps";

// 左の列に出すアイコン。線だけの簡単な形にしている。
// 塗りつぶしの絵にすると、小さくしたときに何を表しているか分からなくなるため。
function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
    </svg>
  );
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
    </svg>
  );
}

const TABS: {
  key: Mode;
  label: string;
  short: string;
  Icon: (p: SVGProps<SVGSVGElement>) => React.ReactElement;
}[] = [
  { key: "overall", label: "全体運営", short: "全体", Icon: GridIcon },
  { key: "booths", label: "企画運営", short: "企画", Icon: ListIcon },
  { key: "events", label: "イベント運営", short: "イベント", Icon: CalendarIcon },
  { key: "stamps", label: "スタンプ", short: "スタンプ", Icon: StarIcon },
];

// 運営ダッシュボード。iPad・Macで開く前提で、横幅を使って
// 上下にスクロールしなくても一度に見渡せるようにしている。
//
// 2026-09-15：タブを上の横並びから左の縦並びに移した。
// 横幅がぜんぶ情報に使えるようになり、当日ほとんど切り替えないタブに
// 画面の上端を取られなくなるため。
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
    <div className="flex min-h-screen text-white lg:h-screen lg:overflow-hidden">
      {/* 左：タブ。アイコンだけにすると何の画面か分からなくなるので、
          小さくても文字を添えている。 */}
      <aside className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 border-r border-white/10 px-2 py-3">
        <div className="mb-2 text-center leading-tight">
          <p className="text-[11px] font-medium text-neutral-200">渦潮祭</p>
          <p className="text-[9px] tracking-[0.12em] text-neutral-500">
            ORGANIZER
          </p>
        </div>

        {TABS.map((t) => {
          const active = mode === t.key;
          const Icon = t.Icon;
          return (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              title={t.label}
              aria-current={active ? "page" : undefined}
              className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-colors ${
                active
                  ? "glow-soft border border-org-700 bg-org-900/70 text-org-500"
                  : "border border-transparent text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300"
              }`}
            >
              <Icon
                className="h-[22px] w-[22px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 1.9 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <span className="text-[10px] leading-none">{t.short}</span>
            </button>
          );
        })}
      </aside>

      {/* 右：見出しと本体 */}
      <div className="flex min-w-0 flex-1 flex-col px-4 pb-5 pt-3 lg:px-5">
        <header className="mb-3 flex shrink-0 items-center gap-4">
          <h1 className="text-[15px] font-medium tracking-[0.04em] text-neutral-100">
            {TABS.find((t) => t.key === mode)?.label}
          </h1>
          <div className="ml-auto shrink-0">
            <RefreshBar lastUpdated={lastUpdated} onRefresh={refresh} />
          </div>
        </header>

        {/* 本体。ここだけが縦に伸び、はみ出す部分は各カードの中でスクロールする */}
        <main className="min-h-0 flex-1 pb-4 lg:pb-0">
          {mode === "overall" && (
            <OverallTab
              key={`overall-${reloadKey}`}
              onDataUpdate={onDataUpdate}
            />
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
    </div>
  );
}
