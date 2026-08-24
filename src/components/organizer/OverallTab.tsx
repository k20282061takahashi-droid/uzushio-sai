"use client";

import { useEffect, useState } from "react";
import FloatPanel from "./FloatPanel";
import AnnouncementFloat from "./AnnouncementFloat";
import EmergencyFloat from "./EmergencyFloat";
import LostItemsFloat from "./LostItemsFloat";
import BoothStatusList from "./BoothStatusList";
import EventTimeline, { parseTime } from "./EventTimeline";
import VisitorCountPanel from "@/components/VisitorCountPanel";
import {
  type Announcement,
  type Booth,
  type EmergencyAlertRecord,
  type FestivalEvent,
  type FestivalPhase,
  type LostItemRecord,
  setFestivalPhase,
  subscribeBooths,
  subscribeEmergencyAlerts,
  subscribeEvents,
  subscribeFestivalDays,
  subscribeFestivalPhase,
  subscribeLostItems,
  subscribeStaffAnnouncements,
  subscribeVisitorAnnouncements,
} from "@/lib/booth";
import { todayInJapan } from "@/lib/visits";

type FloatKind = "none" | "emergency" | "announcement" | "timetable" | "lost";

function formatTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// カードの共通の見た目。押すとフロート画面が開く。
function ClickableCard({
  title,
  badge,
  badgeTone = "normal",
  onClick,
  children,
  action,
}: {
  title: string;
  badge?: string;
  badgeTone?: "normal" | "alert";
  onClick: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      onClick={onClick}
      className={`flex h-full cursor-pointer flex-col rounded-xl border bg-white/5 p-4 transition-colors hover:bg-white/[0.07] ${
        badgeTone === "alert"
          ? "border-red-500/40 bg-red-500/10 hover:bg-red-500/15"
          : "border-white/10"
      }`}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-300">
          {title}
          {badge && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                badgeTone === "alert"
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {badge}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <p className="mt-2 shrink-0 text-right text-[10px] text-slate-600">
        押すと詳しく見られます
      </p>
    </section>
  );
}

export default function OverallTab({
  onDataUpdate,
}: {
  onDataUpdate: () => void;
}) {
  const [phase, setPhase] = useState<FestivalPhase>("before");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlertRecord[]>([]);
  const [visitorAnnouncements, setVisitorAnnouncements] = useState<Announcement[]>([]);
  const [staffAnnouncements, setStaffAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<FestivalEvent[]>([]);
  const [lostItems, setLostItems] = useState<LostItemRecord[]>([]);
  const [days, setDays] = useState<string[]>([]);

  const [float, setFloat] = useState<FloatKind>("none");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => subscribeFestivalPhase(setPhase), []);
  useEffect(() => subscribeFestivalDays(setDays), []);
  useEffect(
    () =>
      subscribeBooths((v) => {
        setBooths(v);
        onDataUpdate();
      }),
    [onDataUpdate],
  );
  useEffect(
    () =>
      subscribeEmergencyAlerts((v) => {
        setAlerts(v);
        onDataUpdate();
      }),
    [onDataUpdate],
  );
  useEffect(() => subscribeVisitorAnnouncements(setVisitorAnnouncements), []);
  useEffect(() => subscribeStaffAnnouncements(setStaffAnnouncements), []);
  useEffect(() => subscribeEvents(setEvents), []);
  useEffect(() => subscribeLostItems(setLostItems), []);

  // 「未更新」の判定に使う現在時刻。1分ごとに取り直す。
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const openAlerts = alerts.filter((a) => a.status === "open");
  const unclaimed = lostItems.filter((i) => i.status === "unclaimed");
  const counts = {
    open: booths.filter((b) => b.status === "open").length,
    break: booths.filter((b) => b.status === "break").length,
    closed: booths.filter((b) => b.status === "closed").length,
  };

  // 送信済みの連絡を、来場者向け・企画向けまとめて新しい順に
  const allAnnouncements = [...visitorAnnouncements, ...staffAnnouncements].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );

  // タイムテーブルは「今日」の分を出す。開催日でなければ1日目を出す。
  const today = todayInJapan();
  const shownDay = days.includes(today) ? today : (days[0] ?? "");
  const todaysEvents = events.filter((e) => e.day === shownDay);

  async function applySwitch() {
    setUpdating(true);
    await setFestivalPhase(phase === "before" ? "during" : "before");
    setUpdating(false);
    setConfirmOpen(false);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* 上部バー */}
      <section className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
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

        <VisitorCountPanel />

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
      </section>

      {/* 本体：左（緊急・連絡）／中央（企画の状況）／右（イベント・落とし物） */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-10">
        {/* 左 */}
        <div className="flex min-h-0 flex-col gap-3 xl:col-span-3">
          <div className="min-h-0 flex-1">
            <ClickableCard
              title="緊急連絡"
              badge={openAlerts.length > 0 ? `${openAlerts.length}件 未対応` : undefined}
              badgeTone={openAlerts.length > 0 ? "alert" : "normal"}
              onClick={() => setFloat("emergency")}
            >
              {openAlerts.length === 0 ? (
                <p className="text-xs text-slate-500">緊急連絡はありません</p>
              ) : (
                <ul className="space-y-1.5">
                  {openAlerts.slice(0, 4).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg bg-red-500/15 px-2 py-1.5 text-xs"
                    >
                      <p className="truncate font-semibold">{a.boothName}</p>
                      {a.message && (
                        <p className="truncate text-[11px] text-slate-300">
                          {a.message}
                        </p>
                      )}
                    </li>
                  ))}
                  {openAlerts.length > 4 && (
                    <li className="text-[11px] text-slate-400">
                      ほか{openAlerts.length - 4}件
                    </li>
                  )}
                </ul>
              )}
            </ClickableCard>
          </div>

          <div className="min-h-0 flex-1">
            <ClickableCard
              title="連絡"
              onClick={() => setFloat("announcement")}
              action={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFloat("announcement");
                  }}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white active:scale-95"
                >
                  ＋ 新規
                </button>
              }
            >
              {allAnnouncements.length === 0 ? (
                <p className="text-xs text-slate-500">まだ送信していません</p>
              ) : (
                <ul className="space-y-1.5">
                  {allAnnouncements.slice(0, 5).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg bg-white/5 px-2 py-1.5 text-xs"
                    >
                      <p className="truncate font-medium">
                        {a.pinned && <span className="mr-1">📌</span>}
                        {a.title}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {formatTime(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </ClickableCard>
          </div>
        </div>

        {/* 中央 */}
        <div className="min-h-0 xl:col-span-4">
          <BoothStatusList booths={booths} now={now} />
        </div>

        {/* 右 */}
        <div className="flex min-h-0 flex-col gap-3 xl:col-span-3">
          <div className="min-h-0 flex-1">
            <ClickableCard
              title="イベントのタイムテーブル"
              badge={shownDay || undefined}
              onClick={() => setFloat("timetable")}
            >
              {todaysEvents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  この日のイベントは登録されていません
                </p>
              ) : (
                <ul className="space-y-1">
                  {[...todaysEvents]
                    .sort(
                      (a, b) =>
                        (parseTime(a.startAt) ?? 0) - (parseTime(b.startAt) ?? 0),
                    )
                    .slice(0, 6)
                    .map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs"
                      >
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">
                          {e.startAt ?? "--:--"}
                        </span>
                        <span className="truncate">
                          {e.name || "（未設定）"}
                        </span>
                        {e.delayed && (
                          <span className="ml-auto shrink-0 text-[10px] text-amber-300">
                            遅延
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </ClickableCard>
          </div>

          <div className="min-h-0 flex-1">
            <ClickableCard
              title="落とし物"
              badge={unclaimed.length > 0 ? `${unclaimed.length}件` : undefined}
              onClick={() => setFloat("lost")}
            >
              {unclaimed.length === 0 ? (
                <p className="text-xs text-slate-500">
                  お預かり中の落とし物はありません
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {unclaimed.slice(0, 6).map((item) =>
                    item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={item.id}
                        src={item.photoUrl}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        key={item.id}
                        className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-[9px] text-slate-500"
                      >
                        画像なし
                      </div>
                    ),
                  )}
                </div>
              )}
            </ClickableCard>
          </div>
        </div>
      </div>

      {/* --- フロート画面 --- */}
      <EmergencyFloat
        open={float === "emergency"}
        onClose={() => setFloat("none")}
        alerts={alerts}
      />
      <AnnouncementFloat
        open={float === "announcement"}
        onClose={() => setFloat("none")}
      />
      <LostItemsFloat
        open={float === "lost"}
        onClose={() => setFloat("none")}
        items={lostItems}
      />
      <FloatPanel
        open={float === "timetable"}
        title="イベントのタイムテーブル"
        subtitle={shownDay ? `${shownDay} の予定` : "開催日が未設定です"}
        onClose={() => setFloat("none")}
        width="medium"
      >
        <div className="h-[60vh]">
          <EventTimeline events={todaysEvents} showNowLine={shownDay === today} />
        </div>
      </FloatPanel>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-slate-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
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
          </div>
        </div>
      )}
    </div>
  );
}
