"use client";

import { useEffect, useMemo, useState } from "react";
import FloatPanel from "./FloatPanel";
import EventTimeline, { formatMinutes, parseTime } from "./EventTimeline";
import {
  type FestivalEvent,
  createEvent,
  delayEvent,
  deleteEvent,
  subscribeEvents,
  subscribeFestivalDays,
  updateEvent,
} from "@/lib/booth";
import { todayInJapan } from "@/lib/visits";

// ステージ発表を行う会場。増やしたいときはここに足してください。
const VENUES = ["体育館", "校庭"];

function nowMinutesInJapan(): number {
  const text = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
}

function dayLabel(date: string, index: number): string {
  if (!date) return `${index + 1}日目`;
  const [, month, day] = date.split("-");
  return `${index + 1}日目 ${Number(month)}/${Number(day)}`;
}

// 「今のイベント」「次のイベント」を出すカード
function HighlightCard({
  label,
  event,
  tone,
  children,
}: {
  label: string;
  event: FestivalEvent | null;
  tone: "now" | "next";
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-[92px] flex-1 items-center gap-4 rounded-xl border p-4 ${
        tone === "now"
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-[11px] font-bold ${
            tone === "now" ? "text-emerald-300" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        {event ? (
          <>
            <p className="mt-0.5 truncate text-lg font-bold">
              {event.name || "（名前未設定）"}
              {event.delayed && (
                <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[11px] text-amber-200">
                  遅延
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">
              {event.startAt ?? "--:--"}
              {event.endAt && `〜${event.endAt}`}
              {event.originalStartAt && (
                <span className="ml-2 text-slate-600 line-through">
                  {event.originalStartAt}
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">予定はありません</p>
        )}
      </div>
      {children}
    </div>
  );
}

// 遅延を知らせるフロート
function DelayFloat({
  event,
  onClose,
}: {
  event: FestivalEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;
  // key を付けて、別のイベントを開いたときに入力欄を作り直す
  return <DelayForm key={event.id} event={event} onClose={onClose} />;
}

function DelayForm({
  event,
  onClose,
}: {
  event: FestivalEvent;
  onClose: () => void;
}) {
  const [newStart, setNewStart] = useState(event.startAt ?? "");
  const [newEnd, setNewEnd] = useState(event.endAt ?? "");
  const [saving, setSaving] = useState(false);

  // 「◯分遅らせる」ボタンで時刻を組み立てる
  function shiftBy(minutes: number) {
    const start = parseTime(event.startAt);
    const end = parseTime(event.endAt);
    if (start === null) return;
    setNewStart(formatMinutes(start + minutes));
    if (end !== null) setNewEnd(formatMinutes(end + minutes));
  }

  async function submit() {
    if (!newStart) return;
    setSaving(true);
    await delayEvent(event, newStart, newEnd || null);
    setSaving(false);
    onClose();
  }

  return (
    <FloatPanel
      open
      title="開始の遅れを知らせる"
      subtitle={`「${event.name || "イベント"}」の開始時刻を変更し、来場者アプリのお知らせに自動で流します`}
      onClose={onClose}
      width="narrow"
    >
      <div className="mb-3 flex gap-2">
        {[5, 10, 15, 30].map((m) => (
          <button
            key={m}
            onClick={() => shiftBy(m)}
            className="flex-1 rounded-lg bg-white/10 py-2 text-sm active:scale-95"
          >
            +{m}分
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">新しい開始時刻</span>
          <input
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            placeholder="10:15"
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">新しい終了時刻</span>
          <input
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            placeholder="11:05"
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-slate-400">
        <p className="mb-1 font-semibold text-slate-300">
          来場者に流れるお知らせ（自動）
        </p>
        <p>
          {event.name || "イベント"}の開始が{newStart || "--:--"}
          に変更になりました
        </p>
      </div>

      <button
        onClick={submit}
        disabled={saving || !newStart}
        className="mt-4 w-full rounded-lg bg-amber-500 p-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
      >
        {saving ? "送信中..." : "変更してお知らせを送る"}
      </button>
    </FloatPanel>
  );
}

// イベントの追加・編集フロート
function EventEditFloat({
  event,
  day,
  venue,
  creating,
  onClose,
}: {
  event: FestivalEvent | null;
  day: string;
  venue: string;
  creating: boolean;
  onClose: () => void;
}) {
  const open = creating || event !== null;
  if (!open) return null;
  // key を付けて、別のイベント（や新規追加）に切り替えたときに入力欄を作り直す
  return (
    <EventEditForm
      key={event?.id ?? "new"}
      event={event}
      day={day}
      venue={venue}
      creating={creating}
      onClose={onClose}
    />
  );
}

function EventEditForm({
  event,
  day,
  venue,
  creating,
  onClose,
}: {
  event: FestivalEvent | null;
  day: string;
  venue: string;
  creating: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(event?.name ?? "");
  const [startAt, setStartAt] = useState(event?.startAt ?? "");
  const [endAt, setEndAt] = useState(event?.endAt ?? "");
  const [status, setStatus] = useState(event?.status ?? "scheduled");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit() {
    setSaving(true);
    if (creating) {
      await createEvent({ day, venue, name, startAt, endAt });
    } else if (event) {
      await updateEvent(event.id, {
        name: name || null,
        startAt: startAt || null,
        endAt: endAt || null,
        venue,
        status,
      });
    }
    setSaving(false);
    onClose();
  }

  return (
    <FloatPanel
      open
      title={creating ? "イベントを追加" : "イベントを編集"}
      subtitle={`${day} ・ ${venue}`}
      onClose={onClose}
      width="narrow"
    >
      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-slate-400">企画・催し名</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例）吹奏楽部 演奏会"
          className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">開始</span>
          <input
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            placeholder="9:00"
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">終了</span>
          <input
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            placeholder="9:50"
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
          />
        </label>
      </div>

      {!creating && (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs text-slate-400">状態</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-sm"
          >
            <option value="scheduled">予定通り</option>
            <option value="cancelled">中止</option>
          </select>
        </label>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !name || !startAt}
          className="flex-1 rounded-lg bg-emerald-500 p-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
        >
          {saving ? "保存中..." : creating ? "追加する" : "保存する"}
        </button>
        {!creating && event && (
          confirmDelete ? (
            <button
              onClick={async () => {
                await deleteEvent(event.id);
                onClose();
              }}
              className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white active:scale-95"
            >
              本当に削除
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg bg-red-500/20 px-4 py-2.5 text-sm text-red-200 active:scale-95"
            >
              削除
            </button>
          )
        )}
      </div>
    </FloatPanel>
  );
}

export default function EventsTab({ onDataUpdate }: { onDataUpdate: () => void }) {
  const [events, setEvents] = useState<FestivalEvent[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [venue, setVenue] = useState(VENUES[0]);
  const [editing, setEditing] = useState<FestivalEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [delaying, setDelaying] = useState<FestivalEvent | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(
    () =>
      subscribeEvents((v) => {
        setEvents(v);
        onDataUpdate();
      }),
    [onDataUpdate],
  );
  useEffect(() => subscribeFestivalDays(setDays), []);

  useEffect(() => {
    const update = () => setNowMin(nowMinutesInJapan());
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const day = days[dayIndex] ?? "";
  const today = todayInJapan();
  const isToday = day === today;

  // 選んでいる日・会場のイベント
  const shown = useMemo(
    () =>
      events
        .filter((e) => e.day === day && (e.venue ?? VENUES[0]) === venue)
        .sort((a, b) => (parseTime(a.startAt) ?? 0) - (parseTime(b.startAt) ?? 0)),
    [events, day, venue],
  );

  // 今やっているイベントと、次のイベント
  const { current, next } = useMemo(() => {
    if (nowMin === null || !isToday) {
      return { current: null, next: shown[0] ?? null };
    }
    const running =
      shown.find((e) => {
        const s = parseTime(e.startAt);
        const en = parseTime(e.endAt);
        return s !== null && en !== null && nowMin >= s && nowMin < en;
      }) ?? null;
    const upcoming =
      shown.find((e) => {
        const s = parseTime(e.startAt);
        return s !== null && s > nowMin;
      }) ?? null;
    return { current: running, next: upcoming };
  }, [shown, nowMin, isToday]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* 日付と会場の切り替え */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(days.length > 0 ? days : ["", ""]).map((d, i) => (
            <button
              key={d || i}
              onClick={() => setDayIndex(i)}
              className={
                dayIndex === i
                  ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
                  : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
              }
            >
              {dayLabel(d, i)}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {VENUES.map((v) => (
            <button
              key={v}
              onClick={() => setVenue(v)}
              className={
                venue === v
                  ? "rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950"
                  : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
              }
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCreating(true)}
          disabled={!day}
          className="ml-auto rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
        >
          ＋ イベントを追加
        </button>
      </div>

      {!day && (
        <p className="rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
          開催日が未設定です。全体運営タブの「日程を設定」から先に設定してください。
        </p>
      )}

      {/* 今のイベント／次のイベント */}
      <div className="flex shrink-0 gap-3">
        <HighlightCard label="今のイベント" event={current} tone="now" />
        <HighlightCard label="次のイベント" event={next} tone="next">
          {next && (
            <button
              onClick={() => setDelaying(next)}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white active:scale-95"
            >
              開始の遅れを
              <br />
              知らせる
            </button>
          )}
        </HighlightCard>
      </div>

      {/* タイムテーブル */}
      <div className="min-h-0 flex-1">
        <EventTimeline
          events={shown}
          showNowLine={isToday}
          onSelect={setEditing}
          selectedId={editing?.id ?? null}
        />
      </div>

      <EventEditFloat
        event={editing}
        day={day}
        venue={venue}
        creating={creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
      <DelayFloat event={delaying} onClose={() => setDelaying(null)} />
    </div>
  );
}
