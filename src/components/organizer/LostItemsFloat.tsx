"use client";

import { useState } from "react";
import FloatPanel from "./FloatPanel";
import { type LostItemRecord, markLostItemClaimed } from "@/lib/booth";

export default function LostItemsFloat({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: LostItemRecord[];
}) {
  const [tab, setTab] = useState<"unclaimed" | "claimed">("unclaimed");

  const unclaimed = items.filter((i) => i.status === "unclaimed");
  const claimed = items.filter((i) => i.status === "claimed");
  const shown = tab === "unclaimed" ? unclaimed : claimed;

  return (
    <FloatPanel
      open={open}
      title="落とし物"
      subtitle="お預かり中のものと、持ち主に返したものを管理します"
      onClose={onClose}
      width="wide"
    >
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("unclaimed")}
          className={
            tab === "unclaimed"
              ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
              : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
          }
        >
          お預かり中（{unclaimed.length}）
        </button>
        <button
          onClick={() => setTab("claimed")}
          className={
            tab === "claimed"
              ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950"
              : "rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300"
          }
        >
          返却済み（{claimed.length}）
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500">
          {tab === "unclaimed"
            ? "お預かり中の落とし物はありません"
            : "返却済みの記録はありません"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {shown.map((item) => (
            <div
              key={item.id}
              className={`overflow-hidden rounded-xl border border-white/10 bg-white/5 ${
                // 返却済みは薄く表示して、未対応と見分けやすくする
                item.status === "claimed" ? "opacity-40" : ""
              }`}
            >
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photoUrl}
                  alt={item.description || "落とし物"}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-slate-950 text-xs text-slate-600">
                  画像なし
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-medium">
                  {item.description || "（内容未入力）"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  拾得: {item.foundLocation || "-"}
                </p>
                <p className="text-[11px] text-slate-500">
                  保管: {item.storageLocation || "-"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  登録: {item.boothName || "-"}
                </p>
                {item.status === "unclaimed" ? (
                  <button
                    onClick={() => markLostItemClaimed(item.id)}
                    className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-xs font-semibold active:scale-95"
                  >
                    返却済みにする
                  </button>
                ) : (
                  <p className="mt-2 rounded-lg bg-emerald-500/20 py-1.5 text-center text-xs text-emerald-200">
                    返却済み
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FloatPanel>
  );
}
