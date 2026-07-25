"use client";

import { useEffect, useState } from "react";
import {
  Announcement,
  Booth,
  BoothStatus,
  BOOTH_TYPE_LABELS,
  EmergencyAlertRecord,
  FestivalPhase,
  LostItemRecord,
  createStaffAnnouncement,
  deleteStaffAnnouncement,
  markLostItemClaimed,
  resolveEmergencyAlert,
  setFestivalPhase,
  setStaffAnnouncementPinned,
  subscribeBooths,
  subscribeEmergencyAlerts,
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

// 天気アプリの「現在地・気温」に相当する、常に見える要約エリア
function OverviewHero() {
  const [phase, setPhase] = useState<FestivalPhase>("before");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlertRecord[]>([]);

  useEffect(() => subscribeFestivalPhase(setPhase), []);
  useEffect(() => subscribeBooths(setBooths), []);
  useEffect(() => subscribeEmergencyAlerts(setAlerts), []);

  const counts = {
    open: booths.filter((b) => b.status === "open").length,
    break: booths.filter((b) => b.status === "break").length,
    closed: booths.filter((b) => b.status === "closed").length,
    notSetup: booths.filter((b) => !b.isSetupDone).length,
  };
  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <section className="mb-6 text-center">
      <p className="text-xs text-slate-400">
        {phase === "before" ? "文化祭前" : "文化祭中"}
      </p>
      <p className="mt-1 text-5xl font-bold tabular-nums">{counts.open}</p>
      <p className="text-sm text-slate-400">企画が開催中（全{booths.length}件）</p>

      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div>
          <p className="font-bold text-amber-200">{counts.break}</p>
          <p className="text-xs text-slate-500">休憩中</p>
        </div>
        <div>
          <p className="font-bold text-slate-300">{counts.closed}</p>
          <p className="text-xs text-slate-500">終了</p>
        </div>
        <div>
          <p className="font-bold text-red-300">{counts.notSetup}</p>
          <p className="text-xs text-slate-500">未設定</p>
        </div>
      </div>

      {openAlerts.length > 0 && (
        <div className="mx-auto mt-4 max-w-xs rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white">
          🚨 緊急連絡 {openAlerts.length}件、対応が必要です
        </div>
      )}
    </section>
  );
}

function PhaseCard() {
  const [phase, setPhase] = useState<FestivalPhase>("before");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => subscribeFestivalPhase(setPhase), []);

  async function applySwitch() {
    setUpdating(true);
    await setFestivalPhase(phase === "before" ? "during" : "before");
    setUpdating(false);
    setConfirmOpen(false);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="mb-1 text-xs text-slate-400">文化祭の状態</p>
      <p className="mb-3 text-2xl font-bold">
        {phase === "before" ? "文化祭前" : "文化祭中"}
      </p>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={updating}
        className={
          phase === "before"
            ? "w-full rounded-lg bg-emerald-500 p-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
            : "w-full rounded-lg bg-white/10 p-3 text-sm font-bold active:scale-95 disabled:opacity-50"
        }
      >
        {phase === "before" ? "文化祭を開始する" : "文化祭前の状態に戻す"}
      </button>

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

function BoothOverviewCard() {
  const [booths, setBooths] = useState<Booth[]>([]);

  useEffect(() => subscribeBooths(setBooths), []);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">
        企画の一覧（{booths.length}件）
      </h2>
      <div className="max-h-80 space-y-1 overflow-y-auto">
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

function StaffAnnouncementsCard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeStaffAnnouncements(setAnnouncements), []);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await createStaffAnnouncement({ title, body, pinned });
    setTitle("");
    setBody("");
    setPinned(false);
    setSaving(false);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">
        企画担当者への連絡
      </h2>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
      <label className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
        />
        ピン留めする
      </label>
      <button
        onClick={submit}
        disabled={saving || !title.trim()}
        className="mb-4 w-full rounded-lg bg-white/10 p-2 text-sm font-semibold active:scale-95 disabled:opacity-50"
      >
        {saving ? "送信中..." : "送信する"}
      </button>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg bg-white/5 p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-start gap-1 font-medium">
                {a.pinned && <span className="shrink-0 text-amber-400">📌</span>}
                <span>{a.title}</span>
              </p>
              <div className="flex shrink-0 gap-2 text-xs text-slate-400">
                <button
                  onClick={() => setStaffAnnouncementPinned(a.id, !a.pinned)}
                >
                  {a.pinned ? "ピン解除" : "ピン留め"}
                </button>
                <button onClick={() => deleteStaffAnnouncement(a.id)}>
                  削除
                </button>
              </div>
            </div>
            {a.body && <p className="mt-1 text-xs text-slate-400">{a.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function LostItemsCard() {
  const [items, setItems] = useState<LostItemRecord[]>([]);

  useEffect(() => subscribeLostItems(setItems), []);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">
        落とし物（{items.filter((i) => i.status === "unclaimed").length}件 未対応）
      </h2>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-xs text-slate-500">登録されている落とし物はありません</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-lg bg-white/5 p-2 text-sm">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoUrl}
                alt="落とし物"
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">
                画像なし
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.description || "（内容未入力）"}</p>
              <p className="truncate text-xs text-slate-500">
                {item.boothName} ／ 発見: {item.foundLocation || "-"} ／ 保管: {item.storageLocation || "-"}
              </p>
            </div>
            {item.status === "unclaimed" ? (
              <button
                onClick={() => markLostItemClaimed(item.id)}
                className="shrink-0 self-center rounded-lg bg-white/10 px-3 py-1 text-xs active:scale-95"
              >
                返却済みにする
              </button>
            ) : (
              <span className="shrink-0 self-center rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                返却済み
              </span>
            )}
          </div>
        ))}
      </div>
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
      {alerts.length === 0 ? (
        <p className="text-xs text-slate-500">緊急連絡はありません</p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg p-2 text-sm ${a.status === "open" ? "bg-red-500/20" : "bg-white/5"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{a.boothName}</p>
                {a.status === "open" ? (
                  <button
                    onClick={() => resolveEmergencyAlert(a.id)}
                    className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs active:scale-95"
                  >
                    対応済みにする
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-slate-500">対応済み</span>
                )}
              </div>
              {a.message && <p className="mt-1 text-xs text-slate-300">{a.message}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function OrganizerPage() {
  const [mode, setMode] = useState<Mode>("overall");

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 text-white sm:max-w-3xl lg:max-w-6xl">
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
          <OverviewHero />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PhaseCard />
            <EmergencyAlertsCard />
            <BoothOverviewCard />
            <StaffAnnouncementsCard />
            <LostItemsCard />
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
