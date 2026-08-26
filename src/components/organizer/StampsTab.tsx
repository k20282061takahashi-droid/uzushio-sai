"use client";

import { useEffect, useState } from "react";
import QrCode from "./QrCode";
import {
  createStampSpot,
  deleteStampSpot,
  stampUrl,
  subscribeStampSpots,
  updateStampSpot,
  type StampSpot,
} from "@/lib/stamp";

// スタンプラリーの設置場所を管理する画面。
// ・場所を追加すると、その場所だけのQRコードが自動で発行される
// ・「場所のヒント」は、まだ取っていない来場者に薄く表示される
function SpotCard({
  spot,
  origin,
  onDataUpdate,
}: {
  spot: StampSpot;
  origin: string;
  onDataUpdate: () => void;
}) {
  const [name, setName] = useState(spot.name);
  const [hint, setHint] = useState(spot.hint);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const url = stampUrl(origin, spot.code);
  const changed = name !== spot.name || hint !== spot.hint;

  async function save() {
    setSaving(true);
    await updateStampSpot(spot.id, { name, hint });
    setSaving(false);
    onDataUpdate();
  }

  return (
    <li className="rounded-xl border border-white/10 bg-neutral-950/55 p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0 self-center rounded-lg bg-white p-2">
          <QrCode value={url} size={140} />
        </div>

        <div className="min-w-0 flex-1">
          <label className="mb-2 block">
            <span className="mb-1 block text-xs text-neutral-400">場所の名前</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）中庭ステージ"
              className="w-full rounded-lg border border-white/15 bg-neutral-950 p-2.5 text-base"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-neutral-400">
              場所のヒント（まだ取っていない人に表示）
            </span>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="例）高校棟 4F"
              className="w-full rounded-lg border border-white/15 bg-neutral-950 p-2.5 text-base"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={!changed || saving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-lg bg-neutral-900/75 px-4 py-2 text-sm active:scale-95"
            >
              {copied ? "コピーしました" : "URLをコピー"}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-auto rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 active:scale-95"
            >
              削除
            </button>
          </div>

          <p className="mt-2 break-all text-[12px] text-neutral-500">{url}</p>
        </div>
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/12 bg-neutral-900/95 p-5 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-base font-medium">
              「{spot.name || "（名前なし）"}」を削除しますか
            </p>
            <p className="mb-4 text-xs text-neutral-400">
              印刷済みのQRコードは使えなくなります。
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await deleteStampSpot(spot.id);
                  setConfirmDelete(false);
                  onDataUpdate();
                }}
                className="flex-1 rounded-lg bg-red-500 p-3 text-sm font-bold text-white active:scale-95"
              >
                削除する
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg bg-neutral-900/75 p-3 text-sm active:scale-95"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function StampsTab({
  onDataUpdate,
}: {
  onDataUpdate: () => void;
}) {
  const [spots, setSpots] = useState<StampSpot[]>([]);
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(
    () =>
      subscribeStampSpots((v) => {
        setSpots(v);
        onDataUpdate();
      }),
    [onDataUpdate],
  );

  useEffect(() => {
    const timer = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(timer);
  }, []);

  async function add() {
    if (!name.trim()) return;
    setAdding(true);
    const nextOrder =
      spots.length === 0 ? 1 : Math.max(...spots.map((s) => s.order)) + 1;
    await createStampSpot({
      name: name.trim(),
      hint: hint.trim(),
      order: nextOrder,
    });
    setName("");
    setHint("");
    setAdding(false);
  }

  return (
    <div className="h-full overflow-y-auto pb-6">
      <section className="mb-5 rounded-xl border border-white/10 bg-neutral-950/55 p-4">
        <h2 className="mb-1 text-base font-bold">スタンプの設置場所を追加</h2>
        <p className="mb-3 text-xs text-neutral-400">
          追加するとQRコードが自動で発行されます。印刷して設置してください。
          来場者はアプリのスキャン、またはスマホの普通のカメラどちらでも読めます。
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="場所の名前（例）中庭ステージ"
            className="flex-1 rounded-lg border border-white/15 bg-neutral-950 p-3 text-base"
          />
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="場所のヒント（例）高校棟 4F"
            className="flex-1 rounded-lg border border-white/15 bg-neutral-950 p-3 text-base"
          />
          <button
            onClick={add}
            disabled={adding || name.trim() === ""}
            className="rounded-lg bg-emerald-500 px-6 py-3 text-base font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {adding ? "追加中..." : "追加"}
          </button>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-medium text-neutral-300">
        設置場所（{spots.length}件）
      </h2>
      {spots.length === 0 ? (
        <p className="text-sm text-neutral-400">まだ登録されていません</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {spots.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              origin={origin}
              onDataUpdate={onDataUpdate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
