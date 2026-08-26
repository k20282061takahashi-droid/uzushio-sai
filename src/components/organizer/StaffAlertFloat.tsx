"use client";

import { useEffect, useState } from "react";
import FloatPanel from "./FloatPanel";
import { BoothPicker } from "./AnnouncementFloat";
import {
  closeStaffAlert,
  sendStaffAlert,
  subscribeStaffAlerts,
  type Booth,
  type StaffAlertRecord,
} from "@/lib/booth";

function formatTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 運営 → 企画担当者への緊急一斉連絡。
// 送ると、対象の企画担当者ページに赤い全画面警告が割り込みで出る。
export default function StaffAlertFloat({
  open,
  onClose,
  booths,
}: {
  open: boolean;
  onClose: () => void;
  booths: Booth[];
}) {
  const [alerts, setAlerts] = useState<StaffAlertRecord[]>([]);
  const [message, setMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => subscribeStaffAlerts(setAlerts), []);

  const targetCount = sendToAll ? booths.length : selected.size;
  const canSend = message.trim() !== "" && targetCount > 0;

  async function send() {
    setSending(true);
    await sendStaffAlert({
      message: message.trim(),
      targetBoothIds: sendToAll ? null : Array.from(selected),
    });
    setSending(false);
    setConfirming(false);
    setMessage("");
    setSelected(new Set());
    setSendToAll(true);
  }

  const activeList = alerts.filter((a) => a.status === "active");
  const closedList = alerts.filter((a) => a.status === "closed");

  return (
    <FloatPanel
      open={open}
      title="緊急一斉連絡"
      subtitle="企画担当者の画面に、赤い全画面表示で割り込みます"
      onClose={onClose}
      width="medium"
    >
      {/* 送信フォーム */}
      <section className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-neutral-300">連絡内容</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="例）強風のため、屋外企画は一時中止してください"
            className="w-full rounded-lg border border-white/15 bg-neutral-950 p-3 text-base"
          />
        </label>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setSendToAll(true)}
            className={
              sendToAll
                ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-neutral-950"
                : "rounded-lg bg-neutral-900/75 px-4 py-2 text-sm text-neutral-300"
            }
          >
            全企画へ（{booths.length}件）
          </button>
          <button
            onClick={() => setSendToAll(false)}
            className={
              !sendToAll
                ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-neutral-950"
                : "rounded-lg bg-neutral-900/75 px-4 py-2 text-sm text-neutral-300"
            }
          >
            企画を選ぶ
          </button>
        </div>

        {!sendToAll && (
          <div className="mb-3">
            <BoothPicker
              booths={booths}
              selected={selected}
              onChange={setSelected}
            />
          </div>
        )}

        <button
          onClick={() => setConfirming(true)}
          disabled={!canSend}
          className="w-full rounded-lg bg-red-500 p-4 text-base font-bold text-white active:scale-95 disabled:opacity-40"
        >
          緊急連絡を送信する（{targetCount}件）
        </button>
      </section>

      {/* 送信履歴 */}
      <h3 className="mb-2 text-sm font-medium text-neutral-300">
        送信中（{activeList.length}）
      </h3>
      {activeList.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-400">送信中の緊急連絡はありません</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {activeList.map((a) => {
            const total = a.targetBoothIds ? a.targetBoothIds.length : booths.length;
            return (
              <li
                key={a.id}
                className="rounded-lg border border-red-500/40 bg-red-500/10 p-3"
              >
                <p className="font-medium">{a.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-neutral-300">
                    確認 {a.acknowledgedBoothIds.length} / {total} 企画
                  </span>
                  <span className="text-[13px] text-neutral-400">
                    {formatTime(a.createdAt)}
                  </span>
                  <button
                    onClick={() => closeStaffAlert(a.id)}
                    className="ml-auto rounded-lg bg-neutral-900/90 px-3.5 py-2 text-sm font-medium active:scale-95"
                  >
                    取り下げる
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closedList.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-medium text-neutral-300">
            取り下げ済み（{closedList.length}）
          </h3>
          <ul className="space-y-2">
            {closedList.slice(0, 10).map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-white/10 bg-neutral-950/55 p-3 opacity-60"
              >
                <p className="text-sm">{a.message}</p>
                <p className="mt-1 text-[13px] text-neutral-400">
                  確認 {a.acknowledgedBoothIds.length} 企画 ・{" "}
                  {formatTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 送信前の確認 */}
      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/12 bg-neutral-900/95 p-5 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-base font-bold text-red-300">
              {targetCount}件の企画に緊急連絡を送ります
            </p>
            <p className="mb-4 whitespace-pre-wrap rounded-lg bg-neutral-950 p-3 text-sm">
              {message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={sending}
                className="flex-1 rounded-lg bg-red-500 p-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
              >
                {sending ? "送信中..." : "送信する"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg bg-neutral-900/75 p-3 text-sm active:scale-95"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </FloatPanel>
  );
}
