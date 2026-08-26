"use client";

import { useEffect, useState } from "react";
import FloatPanel from "./FloatPanel";
import { PinIcon } from "../Icon";
import AnnouncementFloat from "./AnnouncementFloat";
import EmergencyFloat from "./EmergencyFloat";
import StaffAlertFloat from "./StaffAlertFloat";
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
  markLostItemClaimed,
  subscribeStaffAnnouncements,
  subscribeVisitorAnnouncements,
} from "@/lib/booth";
import { todayInJapan } from "@/lib/visits";

type FloatKind =
  "none" | "emergency" | "staffAlert" | "announcement" | "timetable" | "lost";

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
      className={`flex h-full cursor-pointer flex-col rounded-xl border p-4 transition-colors ${
        badgeTone === "alert"
          ? "border-red-500/45 bg-red-500/10 hover:bg-red-500/15"
          : "border-white/12 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
      }`}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-medium tracking-[0.04em] text-neutral-200">
          {title}
          {badge && (
            <span
              className={`ml-2 rounded-full px-3 py-1 text-[13px] ${
                badgeTone === "alert"
                  ? "bg-red-500 font-medium text-white"
                  : "border border-white/15 text-neutral-300"
              }`}
            >
              {badge}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <p className="mt-2 shrink-0 text-right text-[12px] text-neutral-500">
        押すと詳しく見られます →
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
  const [visitorAnnouncements, setVisitorAnnouncements] = useState<
    Announcement[]
  >([]);
  const [staffAnnouncements, setStaffAnnouncements] = useState<Announcement[]>(
    [],
  );
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
  const allAnnouncements = [
    ...visitorAnnouncements,
    ...staffAnnouncements,
  ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

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
      <section className="flex shrink-0 flex-col items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="w-full sm:w-auto">
          <p className="text-xs text-neutral-400">
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

        <div className="flex w-full justify-center gap-6 text-center sm:w-auto">
          <div>
            <p className="text-2xl font-bold text-emerald-200">{counts.open}</p>
            <p className="text-xs text-neutral-400">開催中</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-200">{counts.break}</p>
            <p className="text-xs text-neutral-400">休憩中</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-300">{counts.closed}</p>
            <p className="text-xs text-neutral-400">終了</p>
          </div>
        </div>
      </section>

      {/* 本体：左（緊急・連絡）／中央（企画の状況）／右（イベント・落とし物） */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-10">
        {/* 左 */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-3">
          <div className="min-h-[13rem] flex-1 lg:min-h-0">
            <ClickableCard
              title="緊急連絡"
              badge={
                openAlerts.length > 0
                  ? `${openAlerts.length}件 未対応`
                  : undefined
              }
              badgeTone={openAlerts.length > 0 ? "alert" : "normal"}
              onClick={() => setFloat("emergency")}
              action={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFloat("staffAlert");
                  }}
                  className="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-bold text-white active:scale-95"
                >
                  一斉連絡
                </button>
              }
            >
              {openAlerts.length === 0 ? (
                <p className="text-xs text-neutral-400">緊急連絡はありません</p>
              ) : (
                <ul className="space-y-1.5">
                  {openAlerts.slice(0, 4).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg bg-red-500/15 px-3 py-2 text-sm"
                    >
                      <p className="truncate font-medium">{a.boothName}</p>
                      {a.message && (
                        <p className="truncate text-[13px] text-neutral-300">
                          {a.message}
                        </p>
                      )}
                    </li>
                  ))}
                  {openAlerts.length > 4 && (
                    <li className="text-[13px] text-neutral-400">
                      ほか{openAlerts.length - 4}件
                    </li>
                  )}
                </ul>
              )}
            </ClickableCard>
          </div>

          <div className="min-h-[13rem] flex-1 lg:min-h-0">
            <ClickableCard
              title="連絡"
              onClick={() => setFloat("announcement")}
              action={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFloat("announcement");
                  }}
                  className="rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-bold text-white active:scale-95"
                >
                  ＋ 新規
                </button>
              }
            >
              {allAnnouncements.length === 0 ? (
                <p className="text-xs text-neutral-400">まだ送信していません</p>
              ) : (
                <ul className="space-y-1.5">
                  {allAnnouncements.slice(0, 5).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg bg-white/5 px-3 py-2 text-sm"
                    >
                      <p className="truncate font-medium">
                        {a.pinned && (
                          <PinIcon className="mr-1 inline h-4 w-4 text-amber-400" />
                        )}
                        {a.title}
                      </p>
                      <p className="text-[12px] text-neutral-400">
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
        <div className="min-h-[26rem] lg:min-h-0 lg:col-span-4">
          <BoothStatusList booths={booths} now={now} />
        </div>

        {/* 右 */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-3">
          <div className="min-h-[13rem] flex-1 lg:min-h-0">
            <ClickableCard
              title="イベントのタイムテーブル"
              badge={shownDay || undefined}
              onClick={() => setFloat("timetable")}
            >
              {todaysEvents.length === 0 ? (
                <p className="text-xs text-neutral-400">
                  この日のイベントは登録されていません
                </p>
              ) : (
                <ul className="space-y-1">
                  {[...todaysEvents]
                    .sort(
                      (a, b) =>
                        (parseTime(a.startAt) ?? 0) -
                        (parseTime(b.startAt) ?? 0),
                    )
                    .slice(0, 6)
                    .map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs"
                      >
                        <span className="shrink-0 font-mono text-[13px] text-neutral-400">
                          {e.startAt ?? "--:--"}
                        </span>
                        <span className="truncate">
                          {e.name || "（未設定）"}
                        </span>
                        {e.delayed && (
                          <span className="ml-auto shrink-0 text-[12px] text-amber-300">
                            遅延
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </ClickableCard>
          </div>

          <div className="min-h-[15rem] flex-1 lg:min-h-0">
            <ClickableCard
              title="落とし物"
              badge={unclaimed.length > 0 ? `${unclaimed.length}件` : undefined}
              onClick={() => setFloat("lost")}
            >
              {unclaimed.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  お預かり中の落とし物はありません
                </p>
              ) : (
                <ul className="space-y-2">
                  {unclaimed.slice(0, 4).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg bg-white/5 p-2"
                    >
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-[12px] text-neutral-400">
                          画像なし
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.description || "（内容未入力）"}
                        </p>
                        <p className="truncate text-[13px] text-neutral-400">
                          拾得: {item.foundLocation || "-"}
                        </p>
                        <p className="truncate text-[13px] text-neutral-400">
                          保管: {item.storageLocation || "-"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markLostItemClaimed(item.id);
                        }}
                        className="shrink-0 self-center rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium active:scale-95"
                      >
                        返却済み
                      </button>
                    </li>
                  ))}
                  {unclaimed.length > 4 && (
                    <li className="text-[13px] text-neutral-400">
                      ほか{unclaimed.length - 4}件
                    </li>
                  )}
                </ul>
              )}
            </ClickableCard>
          </div>
        </div>
      </div>

      {/* --- フロート画面 --- */}
      <StaffAlertFloat
        open={float === "staffAlert"}
        onClose={() => setFloat("none")}
        booths={booths}
      />
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
          <EventTimeline
            events={todaysEvents}
            showNowLine={shownDay === today}
          />
        </div>
      </FloatPanel>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/12 bg-neutral-900 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-center text-base font-medium">
              {phase === "before"
                ? "全企画のページを「文化祭中」に切り替えます。よろしいですか？"
                : "全企画のページを「文化祭前」に戻します。よろしいですか？"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={applySwitch}
                disabled={updating}
                className="flex-1 rounded-lg bg-emerald-500 p-3 text-sm font-medium text-white active:scale-95 disabled:opacity-50"
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
