// 企画の「グループ分け」と「並べ替え」の共通処理。
// 全体運営タブと企画運営タブの両方で同じ基準を使えるようにまとめてある。

import {
  BOOTH_TYPE_LABELS,
  GENRE_LABELS,
  type Booth,
  type BoothStatus,
} from "./booth";

export type GroupKey = "none" | "location" | "floor" | "genre" | "type" | "status";
export type SortKey = "name" | "wait" | "status" | "updated";

export const GROUP_OPTIONS: { key: GroupKey; label: string }[] = [
  { key: "none", label: "グループ分けなし" },
  { key: "location", label: "建物・会場ごと" },
  { key: "floor", label: "階ごと" },
  { key: "genre", label: "カテゴリーごと" },
  { key: "type", label: "種別ごと" },
  { key: "status", label: "状態ごと" },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "名前順" },
  { key: "wait", label: "混んでいる順" },
  { key: "status", label: "状態順" },
  { key: "updated", label: "更新が古い順" },
];

export const STATUS_LABELS: Record<BoothStatus, string> = {
  open: "開催中",
  break: "休憩中",
  closed: "終了",
};

// 待ち時間（分）。待ち時間の仕組みを使わない企画は null。
export function waitMinutesOf(booth: Booth): number | null {
  if (!booth.hasWaiting || !booth.timePerGroup) return null;
  return (booth.waitingGroups ?? 0) * booth.timePerGroup;
}

// この分数だけ待ちグループ数が更新されていなければ「要確認」とみなす。
// 当日、更新を忘れると来場者に古い待ち時間が出続けてしまうため。
export const STALE_MINUTES = 45;

export function isWaitingStale(booth: Booth, now = Date.now()): boolean {
  if (!booth.hasWaiting) return false;
  if (booth.status !== "open") return false;
  if (!booth.waitingUpdatedAt) return true; // 一度も更新されていない
  return now - booth.waitingUpdatedAt > STALE_MINUTES * 60 * 1000;
}

function groupLabelFor(booth: Booth, key: GroupKey): string {
  switch (key) {
    case "location":
      return booth.location || "場所未設定";
    case "floor":
      if (!booth.location) return "場所未設定";
      return booth.floor != null
        ? `${booth.location} ${booth.floor === -1 ? "B1" : `${booth.floor}F`}`
        : booth.location;
    case "genre":
      return booth.genre ? GENRE_LABELS[booth.genre] : "カテゴリー未設定";
    case "type":
      return BOOTH_TYPE_LABELS[booth.type] ?? booth.type;
    case "status":
      return STATUS_LABELS[booth.status];
    default:
      return "";
  }
}

function compare(a: Booth, b: Booth, key: SortKey): number {
  switch (key) {
    case "wait": {
      // 待ち時間が長い順。待ちの仕組みを使わない企画は後ろにまとめる
      const wa = waitMinutesOf(a);
      const wb = waitMinutesOf(b);
      if (wa === null && wb === null) return a.name.localeCompare(b.name, "ja");
      if (wa === null) return 1;
      if (wb === null) return -1;
      return wb - wa || a.name.localeCompare(b.name, "ja");
    }
    case "status": {
      const order: Record<BoothStatus, number> = { open: 0, break: 1, closed: 2 };
      return order[a.status] - order[b.status] || a.name.localeCompare(b.name, "ja");
    }
    case "updated": {
      // 更新が古い順（未更新を最優先で先頭に）
      const ua = a.waitingUpdatedAt ?? 0;
      const ub = b.waitingUpdatedAt ?? 0;
      return ua - ub || a.name.localeCompare(b.name, "ja");
    }
    default:
      return a.name.localeCompare(b.name, "ja");
  }
}

export type BoothGroup = { label: string; booths: Booth[] };

// 企画をグループ分けして並べ替える。
export function groupAndSortBooths(
  booths: Booth[],
  groupKey: GroupKey,
  sortKey: SortKey,
): BoothGroup[] {
  const sorted = [...booths].sort((a, b) => compare(a, b, sortKey));

  if (groupKey === "none") {
    return [{ label: "", booths: sorted }];
  }

  const map = new Map<string, Booth[]>();
  for (const booth of sorted) {
    const label = groupLabelFor(booth, groupKey);
    const list = map.get(label);
    if (list) list.push(booth);
    else map.set(label, [booth]);
  }

  // 「未設定」系は最後にまとめる
  return Array.from(map.entries())
    .map(([label, list]) => ({ label, booths: list }))
    .sort((a, b) => {
      const aUnset = a.label.includes("未設定");
      const bUnset = b.label.includes("未設定");
      if (aUnset !== bUnset) return aUnset ? 1 : -1;
      return a.label.localeCompare(b.label, "ja");
    });
}
