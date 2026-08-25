"use client";

import { useState } from "react";
import FloatPanel from "./FloatPanel";
import {
  type EmergencyAlertRecord,
  resolveEmergencyAlert,
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

export default function EmergencyFloat({
  open,
  onClose,
  alerts,
}: {
  open: boolean;
  onClose: () => void;
  alerts: EmergencyAlertRecord[];
}) {
  const [tab, setTab] = useState<"open" | "resolved">("open");

  const openList = alerts.filter((a) => a.status === "open");
  const resolvedList = alerts.filter((a) => a.status === "resolved");
  const shown = tab === "open" ? openList : resolvedList;

  return (
    <FloatPanel
      open={open}
      title="緊急連絡"
      subtitle="企画担当者から運営へ届いた連絡です"
      onClose={onClose}
      width="medium"
    >
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("open")}
          className={
            tab === "open"
              ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
              : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
          }
        >
          未対応（{openList.length}）
        </button>
        <button
          onClick={() => setTab("resolved")}
          className={
            tab === "resolved"
              ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
              : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
          }
        >
          対応済み（{resolvedList.length}）
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-400">
          {tab === "open"
            ? "未対応の緊急連絡はありません"
            : "対応済みの記録はありません"}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border p-3 ${
                tab === "open"
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-white/10 bg-white/5 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.boothName || "（企画名なし）"}</p>
                  {a.message ? (
                    <p className="mt-1 text-sm text-slate-300">{a.message}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      （内容なし・至急の呼び出し）
                    </p>
                  )}
                  <p className="mt-1 text-[13px] text-slate-400">
                    {formatTime(a.createdAt)}
                  </p>
                </div>
                {a.status === "open" && (
                  <button
                    onClick={() => resolveEmergencyAlert(a.id)}
                    className="shrink-0 rounded-lg bg-white/15 px-3.5 py-2 text-sm font-semibold active:scale-95"
                  >
                    対応済みにする
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </FloatPanel>
  );
}
