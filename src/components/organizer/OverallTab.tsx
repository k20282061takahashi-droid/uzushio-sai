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
import { crowdLevelOfBooth } from "@/lib/boothPlacement";
import { isWaitingStale } from "@/lib/boothGrouping";
import { crowdInfo } from "@/lib/waitColor";
import { Card, Row, StatCard } from "./ui";

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

// カードの見た目は ./ui.tsx の Card / StatCard / Row にまとめてある。
// （2026-09-15、ここにあった ClickableCard はそちらへ移した）

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
  // タイムテーブルで表示している日。null のあいだは自動で決める。
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  // タイムテーブルは「今日」の分を出す。開催日でなければ、
  // 登録されている日の中で実際にイベントがある日を優先して出す
  // （文化祭の前後で「今日」がどの開催日にも当てはまらないとき、
  //   単純に1日目を出すとイベントが2日目にしか無い場合に何も表示されないため）。
  const today = todayInJapan();
  const sortedDays = [...days].sort();
  const dayWithEvents = sortedDays.find((d) =>
    events.some((e) => e.day === d),
  );
  // 何も選んでいないときに出す日
  const autoDay = sortedDays.includes(today)
    ? today
    : (dayWithEvents ?? sortedDays[0] ?? "");
  // 運営が日を選んだらそちらを優先する。開催日の設定が変わって選んだ日が
  // 無くなった場合は、自動で決まる日に戻す。
  const shownDay =
    selectedDay && sortedDays.includes(selectedDay) ? selectedDay : autoDay;
  const todaysEvents = events.filter((e) => e.day === shownDay);

  // いま進行中のイベントと、次に始まるイベント。
  // 表示している日が今日のときだけ意味があるので、それ以外は null にする。
  const nowMinutes = now
    ? (() => {
        const d = new Date(now);
        return d.getHours() * 60 + d.getMinutes();
      })()
    : null;
  const sortedTodaysEvents = [...todaysEvents].sort(
    (a, b) => (parseTime(a.startAt) ?? 0) - (parseTime(b.startAt) ?? 0),
  );
  const isShowingToday = shownDay === today;
  const currentEvent =
    isShowingToday && nowMinutes !== null
      ? (sortedTodaysEvents.find((e) => {
          const start = parseTime(e.startAt);
          const end = parseTime(e.endAt) ?? (start !== null ? start + 60 : null);
          return (
            e.status !== "cancelled" &&
            start !== null &&
            end !== null &&
            start <= nowMinutes &&
            nowMinutes < end
          );
        }) ?? null)
      : null;
  const nextEvent =
    isShowingToday && nowMinutes !== null
      ? (sortedTodaysEvents.find((e) => {
          const start = parseTime(e.startAt);
          return (
            e.status !== "cancelled" && start !== null && start > nowMinutes
          );
        }) ?? null)
      : (sortedTodaysEvents[0] ?? null);

  // ------------------------------------------------------------------
  // 「いま手を打つべきこと」をまとめて数える。
  //
  // 今までは緊急連絡・未更新・未設定がバラバラの場所に出ていて、
  // 全部を見て回らないと安心できなかった。1つの数字にまとめて、
  // ここが0なら大丈夫、という見方ができるようにする。
  // ------------------------------------------------------------------
  // 混みぐあいを長く更新していない企画（来場者に古い情報が出続けてしまう）
  const staleBooths = now
    ? booths.filter((b) => isWaitingStale(b, now))
    : [];
  // 企画名が入っていない企画（来場者の一覧にクラス名しか出ない）
  const unsetBooths = booths.filter((b) => !b.projectName);
  const attentionCount =
    openAlerts.length + staleBooths.length + unsetBooths.length;

  // 混んでいる企画。4（並ぶかも）以上を、混んでいる順に。
  const busyBooths = booths
    .filter((b) => b.status === "open")
    .map((b) => ({ booth: b, level: crowdLevelOfBooth(b) }))
    .filter(
      (x): x is { booth: Booth; level: 4 | 5 } =>
        x.level !== null && x.level >= 4,
    )
    .sort((a, b) => b.level - a.level)
    .slice(0, 6);

  // 1日目・2日目を切り替えるボタン。開催日が2日以上あるときだけ出す。
  // カードの中に置くので、押してもカード全体のクリック（フロートを開く）が
  // 起きないように stopPropagation している。
  const dayTabs =
    sortedDays.length > 1 ? (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {sortedDays.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`rounded-lg px-2.5 py-1 text-[12px] ${
              shownDay === d
                ? "bg-white font-medium text-neutral-950"
                : "border border-white/15 text-neutral-300 hover:bg-white/10"
            }`}
          >
            {i + 1}日目
          </button>
        ))}
      </div>
    ) : null;

  async function applySwitch() {
    setUpdating(true);
    await setFestivalPhase(phase === "before" ? "during" : "before");
    setUpdating(false);
    setConfirmOpen(false);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* ===== 上段：数字を見るだけの3枚 =====
          本部の机から少し離れても読めるよう、数字を大きくしている。 */}
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        {/* ❶ いま手を打つべきこと。ここが0なら安心、という一点にする */}
        <StatCard
          label="要対応"
          value={attentionCount}
          unit="件"
          tone={attentionCount > 0 ? "alert" : "normal"}
          onClick={
            openAlerts.length > 0 ? () => setFloat("emergency") : undefined
          }
          sub={
            attentionCount === 0 ? (
              <span className="text-neutral-500">いまは大丈夫です</span>
            ) : (
              <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                {openAlerts.length > 0 && (
                  <span className="text-danger-600">
                    緊急 {openAlerts.length}
                  </span>
                )}
                {staleBooths.length > 0 && (
                  <span className="text-warn-600">
                    混雑が未更新 {staleBooths.length}
                  </span>
                )}
                {unsetBooths.length > 0 && (
                  <span className="text-neutral-400">
                    企画名が未入力 {unsetBooths.length}
                  </span>
                )}
              </span>
            )
          }
        />

        {/* ❷ 来場者数 */}
        <Card title="来場者数">
          <VisitorCountPanel />
        </Card>

        {/* ❸ 開催の状態 */}
        <Card
          title="開催の状態"
          tone={phase === "during" ? "accent" : "normal"}
        >
          <div className="flex h-full flex-col justify-between gap-2">
            <div>
              <p
                className={`text-[1.75rem] font-medium leading-tight ${
                  phase === "during" ? "text-org-500" : "text-neutral-100"
                }`}
              >
                {phase === "before" ? "文化祭前" : "文化祭中"}
              </p>
              <div className="mt-1 flex gap-4 text-[12px] text-neutral-400">
                <span>
                  開催中{" "}
                  <span className="text-neutral-200 tabular-nums">
                    {counts.open}
                  </span>
                </span>
                <span>
                  休憩{" "}
                  <span className="text-neutral-200 tabular-nums">
                    {counts.break}
                  </span>
                </span>
                <span>
                  終了{" "}
                  <span className="text-neutral-200 tabular-nums">
                    {counts.closed}
                  </span>
                </span>
              </div>
            </div>
            <div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={updating}
                className={
                  phase === "before"
                    ? "w-full rounded-lg bg-org-500 px-4 py-2 text-sm font-medium text-neutral-950 active:scale-95 disabled:opacity-50"
                    : "w-full rounded-lg border border-white/15 px-4 py-2 text-sm text-neutral-300 active:scale-95 disabled:opacity-50"
                }
              >
                {phase === "before" ? "文化祭を開始する" : "文化祭前に戻す"}
              </button>
              {phase === "before" && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
                  来場者には「あと○日」だけが見えています。本番の画面は{" "}
                  <a
                    href="/test"
                    target="_blank"
                    rel="noreferrer"
                    className="text-org-300 underline underline-offset-2"
                  >
                    /test
                  </a>
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ===== 中段：作業する場所 ===== */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        {/* 左：いちばん長く見る「企画の状況」を最大に */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-7">
          <div className="min-h-[24rem] flex-1 lg:min-h-0">
            <BoothStatusList booths={booths} now={now} />
          </div>

          {/* 対応待ちのもの。0件なら静かに、1件でもあれば色がつく */}
          <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Card
              title="緊急連絡"
              badge={
                openAlerts.length > 0
                  ? `${openAlerts.length}件 未対応`
                  : undefined
              }
              tone={openAlerts.length > 0 ? "alert" : "normal"}
              onClick={() => setFloat("emergency")}
              action={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFloat("staffAlert");
                  }}
                  className="rounded-lg bg-danger-800 px-3 py-1.5 text-[12px] font-medium text-white active:scale-95"
                >
                  一斉連絡
                </button>
              }
              className="h-[11.5rem]"
              bodyClassName="overflow-y-auto"
            >
              {openAlerts.length === 0 ? (
                <p className="text-[12px] text-neutral-500">
                  緊急連絡はありません
                </p>
              ) : (
                <div>
                  {openAlerts.slice(0, 5).map((a) => (
                    <Row
                      key={a.id}
                      dot="bg-danger-600"
                      title={a.boothName}
                      sub={a.message || undefined}
                    />
                  ))}
                  {openAlerts.length > 5 && (
                    <p className="pt-1.5 text-[12px] text-neutral-500">
                      ほか{openAlerts.length - 5}件
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card
              title="落とし物"
              badge={unclaimed.length > 0 ? `${unclaimed.length}件` : undefined}
              onClick={() => setFloat("lost")}
              className="h-[11.5rem]"
              bodyClassName="overflow-y-auto"
            >
              {unclaimed.length === 0 ? (
                <p className="text-[12px] text-neutral-500">
                  お預かり中の落とし物はありません
                </p>
              ) : (
                <div>
                  {unclaimed.slice(0, 5).map((item) => (
                    <Row
                      key={item.id}
                      title={item.description || "（内容未入力）"}
                      sub={`拾得 ${item.foundLocation || "-"} ／ 保管 ${
                        item.storageLocation || "-"
                      }`}
                      right={
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markLostItemClaimed(item.id);
                          }}
                          className="rounded-lg border border-white/15 px-2.5 py-1 text-[12px] text-neutral-300 active:scale-95"
                        >
                          返却済み
                        </button>
                      }
                    />
                  ))}
                  {unclaimed.length > 5 && (
                    <p className="pt-1.5 text-[12px] text-neutral-500">
                      ほか{unclaimed.length - 5}件
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* 右：当日の判断に使うもの */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-5">
          {/* ❺ いま進行中のイベント。時計と表を見比べる作業をなくす */}
          <Card
            title="イベントの進行"
            badge={shownDay || undefined}
            action={dayTabs}
            onClick={() => setFloat("timetable")}
            className="shrink-0"
          >
            {currentEvent ? (
              <div className="rounded-xl border border-org-700 bg-org-900/60 px-3 py-2.5">
                <p className="text-[11px] tracking-[0.08em] text-org-300">
                  いま進行中
                </p>
                <p className="mt-0.5 truncate text-[15px] font-medium text-neutral-100">
                  {currentEvent.name || "（未設定）"}
                </p>
                <p className="text-[12px] text-neutral-400">
                  {currentEvent.startAt}
                  {currentEvent.endAt ? `〜${currentEvent.endAt}` : ""}
                  {currentEvent.venue ? ` ・ ${currentEvent.venue}` : ""}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 px-3 py-2.5">
                <p className="text-[12px] text-neutral-500">
                  {isShowingToday
                    ? "いま進行中のイベントはありません"
                    : "この日の予定を表示しています"}
                </p>
              </div>
            )}

            {nextEvent && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <span className="shrink-0 text-[11px] tracking-[0.08em] text-neutral-500">
                  つぎ
                </span>
                <span className="shrink-0 font-mono text-[13px] text-neutral-300">
                  {nextEvent.startAt ?? "--:--"}
                </span>
                <span className="truncate text-[13px] text-neutral-200">
                  {nextEvent.name || "（未設定）"}
                </span>
                {nextEvent.delayed && (
                  <span className="ml-auto shrink-0 text-[12px] text-warn-600">
                    遅延
                  </span>
                )}
              </div>
            )}
          </Card>

          {/* ❻ 混んでいる企画。案内係をどこへ動かすかの判断に直結する */}
          <Card
            title="混んでいる企画"
            badge={busyBooths.length > 0 ? `${busyBooths.length}件` : undefined}
            tone={busyBooths.length > 0 ? "warn" : "normal"}
            className="min-h-[10rem] flex-1"
            bodyClassName="overflow-y-auto"
          >
            {busyBooths.length === 0 ? (
              <p className="text-[12px] text-neutral-500">
                いま混んでいる企画はありません
              </p>
            ) : (
              <div>
                {busyBooths.map(({ booth, level }) => (
                  <Row
                    key={booth.id}
                    title={booth.projectName || booth.name}
                    sub={`${booth.name}${
                      booth.location ? ` ・ ${booth.location}` : ""
                    }`}
                    right={
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: crowdInfo(level).color }}
                      >
                        {crowdInfo(level).label}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          {/* ❾ 連絡 */}
          <Card
            title="連絡"
            onClick={() => setFloat("announcement")}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFloat("announcement");
                }}
                className="rounded-lg bg-org-500 px-3 py-1.5 text-[12px] font-medium text-neutral-950 active:scale-95"
              >
                ＋ 新規
              </button>
            }
            className="h-[11.5rem] shrink-0"
            bodyClassName="overflow-y-auto"
          >
            {allAnnouncements.length === 0 ? (
              <p className="text-[12px] text-neutral-500">
                まだ送信していません
              </p>
            ) : (
              <div>
                {allAnnouncements.slice(0, 5).map((a) => (
                  <Row
                    key={a.id}
                    title={
                      <span className="flex items-center gap-1">
                        {a.pinned && (
                          <PinIcon className="h-3.5 w-3.5 shrink-0 text-warn-600" />
                        )}
                        <span className="truncate">{a.title}</span>
                      </span>
                    }
                    sub={formatTime(a.createdAt)}
                  />
                ))}
              </div>
            )}
          </Card>
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
        {dayTabs && <div className="mb-3">{dayTabs}</div>}
        <div className="h-[60vh]">
          <EventTimeline
            events={todaysEvents}
            showNowLine={shownDay === today}
            scrollSignal={shownDay}
          />
        </div>
      </FloatPanel>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/12 bg-neutral-900/95 p-4 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
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
                className="flex-1 rounded-lg bg-neutral-900/75 p-3 text-sm active:scale-95"
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
