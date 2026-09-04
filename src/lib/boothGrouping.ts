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
  { key: "name", label: "クラス順" },
  { key: "wait", label: "混んでいる順" },
  { key: "status", label: "状態順" },
  { key: "updated", label: "更新が古い順" },
];

export const STATUS_LABELS: Record<BoothStatus, string> = {
  open: "開催中",
  break: "休憩中",
  closed: "終了",
};

// クラス名を学校の名簿の順に並べるための処理。
//
// 並べる順番
//   1. 中学（中1 → 中2 → 中3）
//   2. 高校1年
//   3. 高校2年
//   4. 高校3年
//   5. 部活動・同好会
//   6. その他（同窓会・PTA・有志など）
// それぞれの中は組の順（A→B→C、1→2→3）。
//
// 単純な五十音順だと「1年A組」より「3年A組」が先に来たり、
// 中学と高校が混ざったりして、名簿と見比べながらの作業がしづらいため。

// 全角の数字と漢数字を半角に直す（「２年」「二年」でも読めるように）
const KANJI_NUM: Record<string, string> = { 一: "1", 二: "2", 三: "3" };
function toHalfWidthNumber(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[一二三]/g, (c) => KANJI_NUM[c] ?? c);
}

type ClassKey = { group: number; grade: number; rest: string };

export function classSortKey(name: string): ClassKey {
  const n = toHalfWidthNumber(name.trim());

  // 中学。「中1年A組」「中3B組」「中1-1」など、先頭が「中」のもの
  if (n.startsWith("中")) {
    const m = n.match(/^中\s*(\d)/);
    return { group: 0, grade: m ? Number(m[1]) : 9, rest: n };
  }

  // 高校。「1年A組」「2年C組」など、先頭が学年の数字
  const m = n.match(/^(\d)\s*年/);
  if (m) {
    const grade = Number(m[1]);
    if (grade >= 1 && grade <= 3) return { group: grade, grade, rest: n };
  }

  // 部活動・同好会
  if (/(部|同好会)$/.test(n)) return { group: 4, grade: 0, rest: n };

  return { group: 5, grade: 0, rest: n };
}

// クラス名どうしを名簿の順で比べる
export function compareByClass(a: string, b: string): number {
  const ka = classSortKey(a);
  const kb = classSortKey(b);
  return (
    ka.group - kb.group ||
    ka.grade - kb.grade ||
    ka.rest.localeCompare(kb.rest, "ja")
  );
}

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
      if (wa === null && wb === null) return compareByClass(a.name, b.name);
      if (wa === null) return 1;
      if (wb === null) return -1;
      return wb - wa || compareByClass(a.name, b.name);
    }
    case "status": {
      const order: Record<BoothStatus, number> = { open: 0, break: 1, closed: 2 };
      return order[a.status] - order[b.status] || compareByClass(a.name, b.name);
    }
    case "updated": {
      // 更新が古い順（未更新を最優先で先頭に）
      const ua = a.waitingUpdatedAt ?? 0;
      const ub = b.waitingUpdatedAt ?? 0;
      return ua - ub || compareByClass(a.name, b.name);
    }
    default:
      return compareByClass(a.name, b.name);
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
