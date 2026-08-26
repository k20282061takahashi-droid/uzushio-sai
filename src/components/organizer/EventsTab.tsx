"use client";

import { useEffect, useMemo, useState } from "react";
import FloatPanel from "./FloatPanel";
import EventTimeline, { formatMinutes, parseTime } from "./EventTimeline";
import {
  type FestivalEvent,
  buildDelayMessage,
  cancelEventDelay,
  createEvent,
  delayEvent,
  deleteEvent,
  subscribeEvents,
  subscribeFestivalDays,
  updateEvent,
} from "@/lib/booth";
import { todayInJapan } from "@/lib/visits";
import { useNowMinutes } from "@/lib/nowLine";

// ステージ発表を行う会場。増やしたいときはここに足してください。
const VENUES = ["体育館", "校庭"];

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
          : "border-white/10 bg-neutral-950/70"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-bold ${
            tone === "now" ? "text-emerald-300" : "text-neutral-400"
          }`}
        >
          {label}
        </p>
        {event ? (
          <>
            <p className="mt-0.5 truncate text-lg font-bold">
              {event.name || "（名前未設定）"}
              {event.delayed && (
                <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[13px] text-amber-200">
                  遅延
                </span>
              )}
            </p>
            <p className="text-xs text-neutral-400">
              {event.startAt ?? "--:--"}
              {event.endAt && `〜${event.endAt}`}
              {event.originalStartAt && (
                <span className="ml-2 text-neutral-400 line-through">
                  {event.originalStartAt}
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-neutral-400">予定はありません</p>
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
  const [cancelling, setCancelling] = useState(false);

  // もとの予定時刻。すでに遅らせている場合は最初の予定を使う。
  const baseStart = event.originalStartAt ?? event.startAt;
  const preview = buildDelayMessage(event.name ?? "", baseStart, newStart || "");

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

  // 遅延を取り消して、送ったお知らせも消す
  async function cancel() {
    setCancelling(true);
    await cancelEventDelay(event);
    setCancelling(false);
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
            className="flex-1 rounded-lg bg-neutral-900/75 py-2 text-sm active:scale-95"
          >
            +{m}分
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">新しい開始時刻</span>
          <input
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            placeholder="10:15"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">新しい終了時刻</span>
          <input
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            placeholder="11:05"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 rounded-lg bg-neutral-950/70 p-3 text-sm text-neutral-300">
        <p className="mb-1 text-xs font-medium text-neutral-400">
          来場者に流れるお知らせ（自動）
        </p>
        <p>{newStart ? preview : "（新しい開始時刻を入れてください）"}</p>
      </div>

      <button
        onClick={submit}
        disabled={saving || !newStart}
        className="mt-4 w-full rounded-lg bg-amber-500 p-3.5 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
      >
        {saving
          ? "送信中..."
          : event.delayed
            ? "お知らせを出し直す"
            : "変更してお知らせを送る"}
      </button>

      {/* すでに遅延を知らせている場合は、取り消しもできるようにする */}
      {event.delayed && (
        <div className="mt-3 rounded-lg border border-white/10 bg-neutral-950/70 p-3">
          <p className="mb-2 text-xs text-neutral-400">
            遅延を取り消すと、来場者に送ったお知らせを削除し、
            開始時刻をもとの{event.originalStartAt ?? "予定"}に戻します。
          </p>
          <button
            onClick={cancel}
            disabled={cancelling}
            className="w-full rounded-lg bg-neutral-900/75 p-3 text-sm font-medium active:scale-95 disabled:opacity-40"
          >
            {cancelling ? "取り消し中..." : "遅延を取り消して、お知らせを削除する"}
          </button>
        </div>
      )}
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
  onDelay,
}: {
  event: FestivalEvent | null;
  day: string;
  venue: string;
  creating: boolean;
  onClose: () => void;
  onDelay: (event: FestivalEvent) => void;
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
      onDelay={onDelay}
    />
  );
}

function EventEditForm({
  event,
  day,
  venue,
  creating,
  onClose,
  onDelay,
}: {
  event: FestivalEvent | null;
  day: string;
  venue: string;
  creating: boolean;
  onClose: () => void;
  onDelay: (event: FestivalEvent) => void;
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
        <span className="mb-1 block text-xs text-neutral-400">企画・催し名</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例）吹奏楽部 演奏会"
          className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">開始</span>
          <input
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            placeholder="9:00"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">終了</span>
          <input
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            placeholder="9:50"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />
        </label>
      </div>

      {!creating && (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs text-neutral-400">状態</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          >
            <option value="scheduled">予定通り</option>
            <option value="cancelled">中止</option>
          </select>
        </label>
      )}

      {/* このイベントの遅れを知らせる／取り消す */}
      {!creating && event && (
        <button
          onClick={() => onDelay(event)}
          className={`mt-4 w-full rounded-lg p-3 text-sm font-medium active:scale-95 ${
            event.delayed
              ? "bg-amber-400/20 text-amber-200"
              : "bg-amber-500 text-white"
          }`}
        >
          {event.delayed
            ? "遅延の知らせを出し直す／取り消す"
            : "開始の遅れを知らせる"}
        </button>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !name || !startAt}
          className="flex-1 rounded-lg bg-emerald-500 p-3 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
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
              className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white active:scale-95"
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

  useEffect(
    () =>
      subscribeEvents((v) => {
        setEvents(v);
        onDataUpdate();
      }),
    [onDataUpdate],
  );
  useEffect(() => subscribeFestivalDays(setDays), []);

  const day = days[dayIndex] ?? "";
  const today = todayInJapan();
  const isToday = day === today;
  const nowMin = useNowMinutes(isToday);

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
                  ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-neutral-950"
                  : "rounded-lg bg-neutral-900/75 px-4 py-2 text-sm text-neutral-300"
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
                  ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-neutral-950"
                  : "rounded-lg bg-neutral-900/75 px-4 py-2 text-sm text-neutral-300"
              }
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCreating(true)}
          disabled={!day}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40 sm:ml-auto sm:w-auto"
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
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
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
          scrollSignal={`${day}-${venue}`}
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
        onDelay={(e) => {
          setEditing(null);
          setDelaying(e);
        }}
      />
      <DelayFloat event={delaying} onClose={() => setDelaying(null)} />
    </div>
  );
}
