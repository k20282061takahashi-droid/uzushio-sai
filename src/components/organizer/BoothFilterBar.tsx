"use client";

import {
  GROUP_OPTIONS,
  SORT_OPTIONS,
  type GroupKey,
  type SortKey,
} from "@/lib/boothGrouping";

// 企画の一覧の上に置く、グループ分け・並べ替え・検索の操作列。
export default function BoothFilterBar({
  groupKey,
  onGroupChange,
  sortKey,
  onSortChange,
  search,
  onSearchChange,
  right,
}: {
  groupKey: GroupKey;
  onGroupChange: (key: GroupKey) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {onSearchChange && (
        <input
          type="text"
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="クラス名・企画名で検索"
          className="w-56 rounded-md border border-white/15 bg-transparent px-3.5 py-2 text-sm"
        />
      )}

      <label className="flex items-center gap-1 text-[13px] text-neutral-400">
        まとめ方
        <select
          value={groupKey}
          onChange={(e) => onGroupChange(e.target.value as GroupKey)}
          className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-neutral-200"
        >
          {GROUP_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1 text-[13px] text-neutral-400">
        並び順
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-neutral-200"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {right && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          {right}
        </div>
      )}
    </div>
  );
}
