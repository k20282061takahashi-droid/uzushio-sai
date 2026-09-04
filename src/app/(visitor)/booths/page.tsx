"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DetailSheet from "@/components/DetailSheet";
import BoothDetail from "@/components/BoothDetail";
import {
  GENRE_LABELS,
  subscribeVisitorBooths,
  type Booth,
  type BoothGenre,
} from "@/lib/booth";
import { waitMinutesOfBooth } from "@/lib/boothPlacement";
import {
  CLASS_GROUP_LABELS,
  classGroupOf,
  compareByClass,
} from "@/lib/boothGrouping";
import { matchesSearch } from "@/lib/searchText";
import { pinLook } from "@/lib/waitColor";

type SortKey = "class" | "wait";

// 絞り込みのボタン（横に並ぶ小さなボタン）
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-[13px] font-bold transition-transform active:scale-95 ${
        active
          ? "border-kosei-800 bg-kosei-500 text-white shadow-[0_2px_0_var(--color-kosei-800)]"
          : "border-kosei-300 bg-white text-kosei-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function BoothsPage() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<number | null>(null);
  const [genre, setGenre] = useState<BoothGenre | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("class");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => subscribeVisitorBooths(setBooths), []);

  const shown = useMemo(() => {
    const list = booths.filter((b) => {
      if (group !== null && classGroupOf(b.name) !== group) return false;
      if (genre !== null && b.genre !== genre) return false;
      if (!query.trim()) return true;
      // クラス名・企画名・説明・場所をまとめて探す
      const haystack = [
        b.name,
        b.projectName ?? "",
        b.description ?? "",
        b.location ?? "",
        b.roomName ?? "",
        b.genre ? GENRE_LABELS[b.genre] : "",
      ].join(" ");
      return matchesSearch(haystack, query);
    });

    if (sortKey === "wait") {
      // 空いている順。待ち時間を出していない企画は後ろにまとめる
      return list.sort((a, b) => {
        const wa = waitMinutesOfBooth(a);
        const wb = waitMinutesOfBooth(b);
        if (wa === null && wb === null) return compareByClass(a.name, b.name);
        if (wa === null) return 1;
        if (wb === null) return -1;
        return wa - wb || compareByClass(a.name, b.name);
      });
    }
    return list.sort((a, b) => compareByClass(a.name, b.name));
  }, [booths, query, group, genre, sortKey]);

  const selected = booths.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="animate-fade-in-up mb-3 font-heading text-2xl font-black text-kosei-800">
        企画をさがす
      </h1>

      {/* 検索 */}
      <div className="animate-fade-in-up relative mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="クラス名・企画名で検索（例：2年A組、たこ焼き）"
          className="w-full rounded-2xl border-2 border-kosei-700 bg-white px-4 py-3 text-base text-kosei-800 shadow-[0_3px_0_var(--color-kosei-700)] placeholder:text-kosei-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="検索をやめる"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-kosei-100 px-2 py-0.5 text-sm font-bold text-kosei-700"
          >
            ×
          </button>
        )}
      </div>

      {/* 学年などのまとまり */}
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={group === null} onClick={() => setGroup(null)}>
          すべて
        </Chip>
        {CLASS_GROUP_LABELS.map((label, i) => (
          <Chip key={label} active={group === i} onClick={() => setGroup(i)}>
            {label}
          </Chip>
        ))}
      </div>

      {/* カテゴリー */}
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={genre === null} onClick={() => setGenre(null)}>
          全ジャンル
        </Chip>
        {(Object.keys(GENRE_LABELS) as BoothGenre[]).map((g) => (
          <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
            {GENRE_LABELS[g]}
          </Chip>
        ))}
      </div>

      {/* 並び順 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[13px] font-bold text-kosei-600">並び順</span>
        <Chip active={sortKey === "class"} onClick={() => setSortKey("class")}>
          クラス順
        </Chip>
        <Chip active={sortKey === "wait"} onClick={() => setSortKey("wait")}>
          空いている順
        </Chip>
        <span className="ml-auto text-[13px] font-bold text-kosei-600">
          {shown.length}件
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border-2 border-kosei-200 bg-white/80 px-4 py-8 text-center text-sm font-bold text-kosei-600">
          見つかりませんでした。
          <br />
          ちがう言葉で探してみてください。
        </p>
      ) : (
        <ul className="space-y-2 pb-4">
          {shown.map((b, i) => {
            const minutes = waitMinutesOfBooth(b);
            const look = pinLook(b.status, minutes);
            const place = [
              b.location,
              b.floor != null
                ? b.floor === -1
                  ? "B1"
                  : `${b.floor}F`
                : null,
              b.roomName,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={b.id}>
                <button
                  onClick={() => setSelectedId(b.id)}
                  style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                  className="animate-fade-in-up pressable flex w-full items-center gap-3 rounded-2xl border-2 border-kosei-700 bg-white p-3 text-left shadow-[0_3px_0_var(--color-kosei-700)]"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white font-heading text-[13px] font-black leading-none text-white"
                    style={{
                      backgroundColor: look.bg,
                      opacity: look.faded ? 0.7 : 1,
                    }}
                  >
                    {look.text}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-base font-black text-kosei-800">
                      {b.projectName || b.name}
                    </span>
                    <span className="block truncate text-[13px] font-bold text-kosei-600">
                      {b.name}
                      {place && ` ・ ${place}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DetailSheet open={selected != null} onClose={() => setSelectedId(null)}>
        {selected && (
          <>
            <BoothDetail booth={selected} />
            {selected.location && (
              <Link
                href={`/map?area=${
                  selected.location === "高校棟"
                    ? "senior"
                    : selected.location === "中学棟"
                      ? "junior"
                      : selected.location === "体育館"
                        ? "gym"
                        : "schoolyard"
                }`}
                className="pressable mt-4 block rounded-2xl border-2 border-kosei-800 bg-kosei-500 py-3 text-center font-heading text-base font-black text-white shadow-[0_3px_0_var(--color-kosei-800)]"
              >
                地図で見る
              </Link>
            )}
          </>
        )}
      </DetailSheet>
    </div>
  );
}
