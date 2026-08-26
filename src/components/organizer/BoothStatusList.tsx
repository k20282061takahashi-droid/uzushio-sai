"use client";

import { useMemo, useState } from "react";
import BoothFilterBar from "./BoothFilterBar";
import { BOOTH_TYPE_LABELS, type Booth } from "@/lib/booth";
import {
  groupAndSortBooths,
  isWaitingStale,
  STATUS_LABELS,
  waitMinutesOf,
  type GroupKey,
  type SortKey,
} from "@/lib/boothGrouping";

// ステータスは「塗りつぶしのタグ」ではなく小さな点で示す。
// 58件ぶんの色付きタグが並ぶと画面がうるさくなるため、色は点だけに残す。
function statusDotClass(booth: Booth): string {
  if (booth.status === "open") return "bg-emerald-400";
  if (booth.status === "break") return "bg-amber-400";
  return "bg-neutral-600";
}

// 全体運営タブに置く「企画の状況」。
// 建物・階・カテゴリーでまとめたり、混んでいる順に並べ替えたりできる。
export default function BoothStatusList({
  booths,
  now,
}: {
  booths: Booth[];
  now: number | null;
}) {
  const [groupKey, setGroupKey] = useState<GroupKey>("location");
  const [sortKey, setSortKey] = useState<SortKey>("wait");
  const [search, setSearch] = useState("");
  const [onlyStale, setOnlyStale] = useState(false);

  const filtered = useMemo(() => {
    let list = booths;
    if (search) {
      list = list.filter(
        (b) =>
          b.name.includes(search) || (b.projectName ?? "").includes(search),
      );
    }
    if (onlyStale && now) {
      list = list.filter((b) => isWaitingStale(b, now));
    }
    return list;
  }, [booths, search, onlyStale, now]);

  const groups = useMemo(
    () => groupAndSortBooths(filtered, groupKey, sortKey),
    [filtered, groupKey, sortKey],
  );

  const staleCount = useMemo(
    () => (now ? booths.filter((b) => isWaitingStale(b, now)).length : 0),
    [booths, now],
  );

  return (
    <section className="flex h-full flex-col rounded-xl border border-white/10 bg-neutral-950/70 p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-medium tracking-[0.04em] text-neutral-200">
          企画の状況（{filtered.length}
          {filtered.length !== booths.length && ` / ${booths.length}`}件）
        </h2>
        {staleCount > 0 && (
          <button
            onClick={() => setOnlyStale((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium active:scale-95 ${
              onlyStale
                ? "bg-amber-400 text-neutral-950"
                : "bg-amber-400/20 text-amber-200"
            }`}
          >
            待ち時間が未更新 {staleCount}件
          </button>
        )}
      </div>

      <BoothFilterBar
        groupKey={groupKey}
        onGroupChange={setGroupKey}
        sortKey={sortKey}
        onSortChange={setSortKey}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.label || "all"}>
            {group.label && (
              <p className="sticky top-0 z-10 mb-1 bg-neutral-950/90 py-1 text-[13px] font-bold text-neutral-400 backdrop-blur">
                {group.label}（{group.booths.length}）
              </p>
            )}
            <div className="grid grid-cols-1 gap-x-6 xl:grid-cols-2">
              {group.booths.map((b) => {
                const minutes = waitMinutesOf(b);
                const stale = now ? isWaitingStale(b, now) : false;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-1 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        title={STATUS_LABELS[b.status]}
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(b)}`}
                      />
                      <div className="min-w-0">
                      <p className="truncate text-neutral-100">
                        {b.name}
                        {b.projectName ? `（${b.projectName}）` : ""}
                      </p>
                      <p className="truncate text-[12px] text-neutral-500">
                        {BOOTH_TYPE_LABELS[b.type] ?? b.type}
                        {b.location && ` ・ ${b.location}`}
                        {b.floor != null &&
                          ` ${b.floor === -1 ? "B1" : `${b.floor}F`}`}
                        {!b.isSetupDone && " ・ 未設定"}
                      </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[12px]">
                      {stale && (
                        <span
                          title="待ちグループ数がしばらく更新されていません"
                          className="text-amber-300"
                        >
                          未更新
                        </span>
                      )}
                      <span className="w-12 text-right tabular-nums text-neutral-300">
                        {minutes !== null ? `${minutes}分` : ""}
                      </span>
                      <span className="w-11 text-right text-neutral-500">
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400">該当する企画がありません</p>
        )}
      </div>
    </section>
  );
}
