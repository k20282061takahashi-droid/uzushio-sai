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

function statusClass(booth: Booth): string {
  if (booth.status === "open") return "bg-emerald-500/20 text-emerald-200";
  if (booth.status === "break") return "bg-amber-500/20 text-amber-200";
  return "bg-white/10 text-slate-400";
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
    <section className="flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-300">
          企画の状況（{filtered.length}
          {filtered.length !== booths.length && ` / ${booths.length}`}件）
        </h2>
        {staleCount > 0 && (
          <button
            onClick={() => setOnlyStale((v) => !v)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold active:scale-95 ${
              onlyStale
                ? "bg-amber-400 text-slate-950"
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
              <p className="sticky top-0 z-10 mb-1 bg-slate-900/80 py-1 text-[11px] font-bold text-slate-400 backdrop-blur">
                {group.label}（{group.booths.length}）
              </p>
            )}
            <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
              {group.booths.map((b) => {
                const minutes = waitMinutesOf(b);
                const stale = now ? isWaitingStale(b, now) : false;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {b.name}
                        {b.projectName ? `（${b.projectName}）` : ""}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {BOOTH_TYPE_LABELS[b.type] ?? b.type}
                        {b.location && ` ・ ${b.location}`}
                        {b.floor != null &&
                          ` ${b.floor === -1 ? "B1" : `${b.floor}F`}`}
                        {!b.isSetupDone && " ・ 未設定"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {stale && (
                        <span
                          title="待ちグループ数がしばらく更新されていません"
                          className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-200"
                        >
                          未更新
                        </span>
                      )}
                      {minutes !== null && (
                        <span className="text-xs text-slate-400">
                          待ち{minutes}分
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(b)}`}
                      >
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
          <p className="text-xs text-slate-500">該当する企画がありません</p>
        )}
      </div>
    </section>
  );
}
