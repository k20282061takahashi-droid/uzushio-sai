"use client";

import { useEffect, useRef, useState } from "react";
import {
  acknowledgeStaffAlert,
  subscribeStaffAlertsForBooth,
  type StaffAlertRecord,
} from "@/lib/booth";
import { AlertIcon } from "./Icon";

// 運営から届いた緊急一斉連絡を、企画担当者の画面に割り込みで出す。
// ・赤い全画面表示 ＋ 音 ＋ バイブ（対応端末のみ）
// ・「確認しました」を押すまで消えない
// ・押すと運営側に確認済みとして記録される
//
// 注意：この仕組みはページを開いている端末にだけ届く。
// 画面を閉じている場合はプッシュ通知が必要になる（未対応）。

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // 「ピー・ピー・ピー」と3回鳴らす
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      const start = ctx.currentTime + i * 0.45;
      osc.start(start);
      osc.stop(start + 0.25);
    }
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // 音が鳴らせない環境（自動再生の制限など）では何もしない
  }
}

export default function StaffAlertOverlay({ boothId }: { boothId: string }) {
  const [alerts, setAlerts] = useState<StaffAlertRecord[]>([]);
  const [acknowledging, setAcknowledging] = useState(false);
  // すでに音を鳴らした連絡のID
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!boothId) return;
    return subscribeStaffAlertsForBooth(boothId, setAlerts);
  }, [boothId]);

  // まだ自分が確認していないもののうち、いちばん新しいもの
  const current = alerts.find((a) => !a.acknowledgedBoothIds.includes(boothId));

  useEffect(() => {
    if (!current) return;
    if (notified.current.has(current.id)) return;
    notified.current.add(current.id);
    beep();
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  }, [current]);

  if (!current) return null;

  async function acknowledge() {
    if (!current) return;
    setAcknowledging(true);
    await acknowledgeStaffAlert(current.id, boothId);
    setAcknowledging(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/95 p-4">
      <div className="w-full max-w-lg rounded-2xl border-2 border-red-400 bg-red-600 p-6 text-white shadow-2xl">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold tracking-widest">
          <AlertIcon className="h-6 w-6 animate-pulse" />
          運営からの緊急連絡
        </p>
        <p className="mb-6 whitespace-pre-wrap text-2xl font-bold leading-snug sm:text-3xl">
          {current.message}
        </p>
        <button
          onClick={acknowledge}
          disabled={acknowledging}
          className="w-full rounded-xl bg-white p-4 text-lg font-bold text-red-700 active:scale-95 disabled:opacity-60"
        >
          {acknowledging ? "送信中..." : "確認しました"}
        </button>
        <p className="mt-3 text-center text-xs text-red-100">
          押すと運営に「確認済み」が伝わります
        </p>
      </div>
    </div>
  );
}

// 確認したあとも「どんな緊急連絡が来ていたか」を画面の一番上に残しておくための帯。
// 割り込みの全画面表示は消えても、内容はここで読み返せる。
export function StaffAlertBanner({ boothId }: { boothId: string }) {
  const [alerts, setAlerts] = useState<StaffAlertRecord[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!boothId) return;
    return subscribeStaffAlertsForBooth(boothId, setAlerts);
  }, [boothId]);

  // いちばん新しい緊急連絡（確認済みかどうかは問わない）
  const latest = alerts[0];
  if (!latest) return null;

  const time = latest.createdAt
    ? new Date(latest.createdAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="mb-3 flex w-full items-center gap-2 rounded-xl border-2 border-red-400/70 bg-red-600/90 px-3 py-2 text-left text-white"
    >
      <AlertIcon className="h-5 w-5 shrink-0" />
      <span className="shrink-0 text-[12px] font-bold tracking-widest">
        本部からの一斉連絡
      </span>
      {time && (
        <span className="shrink-0 text-[12px] text-red-100">{time}</span>
      )}
      <span
        className={`min-w-0 flex-1 whitespace-pre-wrap text-sm ${
          open ? "" : "truncate"
        }`}
      >
        {latest.message}
      </span>
      <span className="shrink-0 text-[12px] text-red-100">
        {open ? "閉じる" : "全文"}
      </span>
    </button>
  );
}
