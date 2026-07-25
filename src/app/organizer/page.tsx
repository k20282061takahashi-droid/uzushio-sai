"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Announcement,
  Booth,
  BoothStatus,
  BOOTH_TYPE_LABELS,
  EmergencyAlertRecord,
  FestivalEvent,
  FestivalPhase,
  LostItemRecord,
  createStaffAnnouncement,
  markLostItemClaimed,
  resolveEmergencyAlert,
  setFestivalPhase,
  subscribeBooths,
  subscribeEmergencyAlerts,
  subscribeEvents,
  subscribeFestivalPhase,
  subscribeLostItems,
  subscribeStaffAnnouncements,
} from "@/lib/booth";

type Mode = "overall" | "booths" | "events";

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function boothStatusLabel(status: BoothStatus): string {
  if (status === "open") return "開催中";
  if (status === "break") return "休憩中";
  return "終了";
}

function boothStatusClass(status: BoothStatus): string {
  if (status === "open") return "bg-emerald-500/20 text-emerald-200";
  if (status === "break") return "bg-amber-500/20 text-amber-200";
  return "bg-white/10 text-slate-400";
}

function eventLabel(e: FestivalEvent): string {
  const time = e.startAt && e.endAt ? `${e.startAt}〜${e.endAt}` : e.startAt ?? "時間未定";
  return `${time} ${e.name ?? "（未設定）"}`;
}

// 一番上: 開催の切り替えと開催中/休憩中/終了の数
function HeroBar() {
  const [phase, setPhase] = useState<FestivalPhase>("before");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => subscribeFestivalPhase(setPhase), []);
  useEffect(() => subscribeBooths(setBooths), []);

  const counts = {
    open: booths.filter((b) => b.status === "open").length,
    break: booths.filter((b) => b.status === "break").length,
    closed: booths.filter((b) => b.status === "closed").length,
  };

  async function applySwitch() {
    setUpdating(true);
    await setFestivalPhase(phase === "before" ? "during" : "before");
    setUpdating(false);
    setConfirmOpen(false);
  }

  return (
    <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-xs text-slate-400">
          {phase === "before" ? "文化祭前" : "文化祭中"}
        </p>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={updating}
          className={
            phase === "before"
              ? "mt-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
              : "mt-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold active:scale-95 disabled:opacity-50"
          }
        >
          {phase === "before" ? "文化祭を開始する" : "文化祭前の状態に戻す"}
        </button>
      </div>

      <div className="flex gap-6 text-center">
        <div>
          <p className="text-2xl font-bold text-emerald-200">{counts.open}</p>
          <p className="text-xs text-slate-500">開催中</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-200">{counts.break}</p>
          <p className="text-xs text-slate-500">休憩中</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-300">{counts.closed}</p>
          <p className="text-xs text-slate-500">終了</p>
        </div>
      </div>

      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <p className="mb-4 text-center text-base font-semibold">
            {phase === "before"
              ? "全企画のページを「文化祭中」に切り替えます。よろしいですか？"
              : "全企画のページを「文化祭前」に戻します。よろしいですか？"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={applySwitch}
              disabled={updating}
              className="flex-1 rounded-lg bg-emerald-500 p-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
            >
              {updating ? "切り替え中..." : "切り替える"}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-lg bg-white/10 p-3 text-sm active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function EmergencyAlertsCard() {
  const [alerts, setAlerts] = useState<EmergencyAlertRecord[]>([]);

  useEffect(() => subscribeEmergencyAlerts(setAlerts), []);

  const open = alerts.filter((a) => a.status === "open");

  return (
    <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
      <h2 className="mb-3 text-sm font-semibold text-red-200">
        緊急連絡（{open.length}件 未対応）
      </h2>
      {open.length === 0 ? (
        <p className="text-xs text-slate-500">緊急連絡はありません</p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {open.map((a) => (
            <div key={a.id} className="rounded-lg bg-red-500/20 p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{a.boothName}</p>
                <button
                  onClick={() => resolveEmergencyAlert(a.id)}
                  className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs active:scale-95"
                >
                  対応済み
                </button>
              </div>
              {a.message && <p className="mt-1 text-xs text-slate-300">{a.message}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StaffAnnouncementSendCard() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await createStaffAnnouncement({ title, body, pinned: false });
    setTitle("");
    setBody("");
    setSaving(false);
    setSent(true);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">連絡送信</h2>
        <Link href="/organizer/announcements" className="text-xs text-slate-400 underline">
          編集画面
        </Link>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setSent(false);
        }}
        placeholder="タイトル"
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="本文（任意）"
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
      />
      <button
        onClick={submit}
        disabled={saving || !title.trim()}
        className="w-full rounded-lg bg-white/10 p-2 text-sm font-semibold active:scale-95 disabled:opacity-50"
      >
        {saving ? "送信中..." : "企画担当者へ送信"}
      </button>
      {sent && <p className="mt-2 text-xs text-emerald-400">送信しました</p>}
    </section>
  );
}

function BoothOverviewCard() {
  const [booths, setBooths] = useState<Booth[]>([]);

  useEffect(() => subscribeBooths(setBooths), []);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">
        企画の状況（{booths.length}件）
      </h2>
      <div className="max-h-[32rem] space-y-1 overflow-y-auto">
        {booths.map((b) => {
          const minutes =
            b.hasWaiting && b.timePerGroup
              ? (b.waitingGroups ?? 0) * b.timePerGroup
              : null;
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
                <p className="truncate text-xs text-slate-500">
                  {BOOTH_TYPE_LABELS[b.type] ?? b.type}
                  {!b.isSetupDone && " ・ 未設定"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {minutes !== null && (
                  <span className="text-xs text-slate-400">待ち{minutes}分</span>
                )}
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${boothStatusClass(b.status)}`}
                >
                  {boothStatusLabel(b.status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventsTimetableCard({ full = false }: { full?: boolean }) {
  const [events, setEvents] = useState<FestivalEvent[]>([]);

  useEffect(() => subscribeEvents(setEvents), []);

  const days = Array.from(new Set(events.map((e) => e.day))).sort();

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">
        イベントのタイムテーブル
      </h2>
      <div className={full ? "space-y-4" : "max-h-64 space-y-3 overflow-y-auto"}>
        {days.map((day) => (
          <div key={day}>
            <p className="mb-1 text-xs font-semibold text-slate-400">{day}</p>
            <ul className="space-y-1">
              {events
                .filter((e) => e.day === day)
                .map((e) => (
                  <li key={e.id} className="rounded-lg bg-white/5 px-2 py-1 text-xs">
                    {eventLabel(e)}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function LostItemsCard({ full = false }: { full?: boolean }) {
  const [items, setItems] = useState<LostItemRecord[]>([]);

  useEffect(() => subscribeLostItems(setItems), []);

  const shown = full ? items : items.slice(0, 3);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">
        落とし物（{items.filter((i) => i.status === "unclaimed").length}件 未対応）
      </h2>
      <div className={full ? "space-y-2" : "max-h-64 space-y-2 overflow-y-auto"}>
        {shown.length === 0 && (
          <p className="text-xs text-slate-500">登録されている落とし物はありません</p>
        )}
        {shown.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-lg bg-white/5 p-2 text-sm">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoUrl}
                alt="落とし物"
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[9px] text-slate-500">
                画像なし
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {item.description || "（内容未入力）"}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {item.boothName} ／ 保管: {item.storageLocation || "-"}
              </p>
            </div>
            {item.status === "unclaimed" ? (
              <button
                onClick={() => markLostItemClaimed(item.id)}
                className="shrink-0 self-center rounded-lg bg-white/10 px-2 py-1 text-[11px] active:scale-95"
              >
                返却済み
              </button>
            ) : (
              <span className="shrink-0 self-center rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-200">
                返却済み
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function StaffAnnouncementHistoryCard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => subscribeStaffAnnouncements(setAnnouncements), []);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">連絡の履歴</h2>
        <Link href="/organizer/announcements" className="text-xs text-slate-400 underline">
          編集する
        </Link>
      </div>
      <div className="space-y-2">
        {announcements.length === 0 && (
          <p className="text-xs text-slate-500">まだ送信していません</p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg bg-white/5 p-2 text-sm">
            <p className="flex items-start gap-1 font-medium">
              {a.pinned && <span className="shrink-0 text-amber-400">📌</span>}
              <span>{a.title}</span>
            </p>
            {a.body && <p className="mt-1 text-xs text-slate-400">{a.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OrganizerPage() {
  const [mode, setMode] = useState<Mode>("overall");

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 text-white sm:max-w-3xl lg:max-w-7xl">
      <div className="mb-4">
        <h1 className="text-sm font-bold text-slate-300">渦潮祭</h1>
        <p className="text-xs text-slate-500">運営用</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "overall", label: "全体運営" },
            { key: "booths", label: "企画運営" },
            { key: "events", label: "イベント運営" },
          ] as { key: Mode; label: string }[]
        ).map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={
              mode === m.key
                ? "rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-950"
                : "rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-300"
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "overall" && (
        <div>
          <HeroBar />

          {/* 左2:中央6:右2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
            <div className="space-y-4 lg:col-span-2">
              <EmergencyAlertsCard />
              <StaffAnnouncementSendCard />
            </div>
            <div className="lg:col-span-6">
              <BoothOverviewCard />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <EventsTimetableCard />
              <LostItemsCard />
            </div>
          </div>

          {/* ここから下はスクロールしないと見えない詳細情報 */}
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-400">詳細情報</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EventsTimetableCard full />
              <LostItemsCard full />
              <StaffAnnouncementHistoryCard />
            </div>
          </div>
        </div>
      )}

      {mode === "booths" && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
          企画運営は準備中です。
        </section>
      )}

      {mode === "events" && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
          イベント運営は準備中です。
        </section>
      )}
    </div>
  );
}
