"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { subscribeEvents, type FestivalEvent } from "@/lib/booth";
import { useNowMinutes } from "@/lib/nowLine";
import { todayInJapan } from "@/lib/visits";

// ホーム画面の「今のイベント / 次のイベント」カード。
// 実際の時刻を1分ごとに見て、今やっているイベントと次のイベントを選び直す。

// "10:30" のような文字列を、0:00からの分数に直す
function toMinutes(text: string | null): number | null {
  if (!text) return null;
  const [h, m] = text.split(/[:：]/).map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

// 終了時刻が入っていないイベントは、1時間で終わる扱いにする
const DEFAULT_LENGTH = 60;

function timeLabel(ev: FestivalEvent): string {
  const start = ev.startAt ?? "";
  return ev.endAt ? `${start}〜${ev.endAt}` : `${start}〜`;
}

// 「9/19」の形にする
function dayLabel(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${Number(month)}/${Number(day)} ` : "";
}

export default function NowNextEvent() {
  const [allEvents, setAllEvents] = useState<FestivalEvent[]>([]);

  useEffect(() => subscribeEvents(setAllEvents), []);

  // 今の時刻（分）。1分ごとに更新される。画面を開いた直後だけ null
  const nowMin = useNowMinutes(true);

  const { today, current, next } = useMemo(() => {
    const empty = {
      today: "",
      current: null as FestivalEvent | null,
      next: null as FestivalEvent | null,
    };
    if (nowMin === null) return empty;
    const today = todayInJapan();

    // 中止になったイベントと、時刻が入っていないイベントは除く
    const events = allEvents
      .filter((e) => e.status !== "cancelled" && toMinutes(e.startAt) !== null)
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) ||
          (toMinutes(a.startAt) ?? 0) - (toMinutes(b.startAt) ?? 0),
      );

    // 今やっているもの＝今日のイベントで、開始済みかつ終了していないもの
    const current =
      events.find((e) => {
        if (e.day !== today) return false;
        const start = toMinutes(e.startAt)!;
        const end = toMinutes(e.endAt) ?? start + DEFAULT_LENGTH;
        return start <= nowMin && nowMin < end;
      }) ?? null;

    // 次のもの＝今日のまだ始まっていないイベント。無ければ次の開催日の最初のイベント
    const next =
      events.find((e) => {
        if (e.day > today) return true;
        if (e.day !== today) return false;
        return toMinutes(e.startAt)! > nowMin;
      }) ?? null;

    return { today, current, next };
  }, [allEvents, nowMin]);

  return (
    <Link
      href="/timeline"
      className="pressable animate-fade-in-up mb-6 block rounded-3xl border-2 border-kosei-700 bg-kosei-50 p-4 shadow-[0_5px_0_var(--color-kosei-700)]"
      style={{ animationDelay: "120ms" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 rounded-full bg-kosei-800 px-3.5 py-0.5 font-heading text-xs font-black text-white">
          Now
        </span>
        {current && (
          <span className="text-sm font-medium text-kosei-700">{timeLabel(current)}</span>
        )}
      </div>
      <p className="mb-1 truncate font-heading text-2xl font-black text-kosei-800">
        {current ? (current.name ?? "イベント") : "準備中"}
      </p>
      <p className="mb-3 text-sm text-kosei-600">
        {current ? `@${current.venue || "会場未定"}` : "まもなく次のイベントが始まります"}
      </p>

      <div className="flex items-center gap-2 border-t border-dashed border-kosei-200 pt-2 text-sm">
        <span className="shrink-0 rounded-full bg-kosei-500 px-2.5 py-0.5 text-xs font-bold text-white">
          Next
        </span>
        {next ? (
          <>
            <span className="shrink-0 text-kosei-700">
              {next.day !== today ? dayLabel(next.day) : ""}
              {next.startAt}〜
            </span>
            <span className="truncate font-bold text-kosei-800">
              {next.name ?? "イベント"}
            </span>
            <span className="ml-auto shrink-0 text-kosei-600">
              @{next.venue || "会場未定"}
            </span>
          </>
        ) : (
          <span className="text-kosei-600">
            {current ? "このあとの予定はありません" : "予定は準備中です"}
          </span>
        )}
      </div>
    </Link>
  );
}
