"use client";

import { useEffect, useState } from "react";
import {
  FestivalPhase,
  setFestivalPhase,
  subscribeFestivalPhase,
} from "@/lib/booth";

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

export default function OrganizerPhasePage() {
  const [phase, setPhase] = useState<FestivalPhase>("before");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    return subscribeFestivalPhase(setPhase);
  }, []);

  async function applySwitch() {
    setUpdating(true);
    await setFestivalPhase(phase === "before" ? "during" : "before");
    setUpdating(false);
    setConfirmOpen(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 text-white">
      <h1 className="text-sm font-bold text-slate-300">渦潮祭</h1>
      <p className="mb-6 text-xs text-slate-500">運営用</p>

      <section className="mb-4 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="mb-2 text-xs text-slate-400">現在の状態</p>
        <p className="text-4xl font-bold">
          {phase === "before" ? "文化祭前" : "文化祭中"}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          全企画の管理者ページに反映されます
        </p>
      </section>

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={updating}
        className={
          phase === "before"
            ? "w-full rounded-xl bg-emerald-500 p-4 text-base font-bold text-white active:scale-95 disabled:opacity-50"
            : "w-full rounded-xl bg-white/10 p-4 text-base font-bold text-white active:scale-95 disabled:opacity-50"
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
    </div>
  );
}
