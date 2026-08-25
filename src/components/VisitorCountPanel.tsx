"use client";

import { useCallback, useEffect, useState } from "react";
import {
  setFestivalDays,
  subscribeFestivalDays,
} from "@/lib/booth";
import { countVisitsOn, todayInJapan } from "@/lib/visits";

// 運営ダッシュボードの上部に出す来場者数パネル。
//
// ・1日目と2日目の日付は運営が設定する（「日程を設定」から）
// ・1日目の人数は常に表示
// ・2日目に入ったら、2日目の人数と合計も表示する
// ・数えているのは「アプリを開いた端末の数」。同じ端末で開き直しても1人のまま

const REFRESH_INTERVAL_MS = 60_000; // 1分ごとに数え直す

function formatDayLabel(date: string): string {
  if (!date) return "未設定";
  const [, month, day] = date.split("-");
  if (!month || !day) return date;
  return `${Number(month)}/${Number(day)}`;
}

function CountBlock({
  label,
  sub,
  value,
  loading,
  accent,
}: {
  label: string;
  sub?: string;
  value: number | null;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={
          accent
            ? "text-2xl font-bold text-sky-200"
            : "text-2xl font-bold text-slate-100"
        }
      >
        {loading && value === null ? "…" : (value ?? 0).toLocaleString("ja-JP")}
      </p>
      <p className="text-xs text-slate-400">
        {label}
        {sub && <span className="ml-1 text-slate-400">{sub}</span>}
      </p>
    </div>
  );
}

export default function VisitorCountPanel() {
  const [days, setDays] = useState<string[]>([]);
  const [counts, setCounts] = useState<(number | null)[]>([null, null]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => subscribeFestivalDays(setDays), []);

  const day1 = days[0] ?? "";
  const day2 = days[1] ?? "";
  const today = todayInJapan();

  // 2日目の日付になったら、2日目と合計を表示する
  const showDay2 = Boolean(day2) && today >= day2;

  const refresh = useCallback(async () => {
    // 日程が未設定のときは数えようがないので何もしない
    if (!day1 && !day2) return;
    try {
      const [c1, c2] = await Promise.all([
        day1 ? countVisitsOn(day1) : Promise.resolve(0),
        day2 ? countVisitsOn(day2) : Promise.resolve(0),
      ]);
      setCounts([c1, c2]);
      setError(false);
    } catch {
      // 権限不足などで数えられなかった場合
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [day1, day2]);

  useEffect(() => {
    // 表示直後に1回、そのあとは1分ごとに数え直す
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  function openEditor() {
    setDraft([day1, day2]);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    await setFestivalDays(draft.filter(Boolean));
    setSaving(false);
    setEditing(false);
  }

  const [c1, c2] = counts;
  const total = (c1 ?? 0) + (c2 ?? 0);

  // 日程が未設定のとき
  if (!day1 && !day2) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 px-4">
        <p className="text-xs text-slate-400">
          来場者数を表示するには開催日の設定が必要です
        </p>
        <button
          onClick={openEditor}
          className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold active:scale-95"
        >
          日程を設定
        </button>
        {editing && (
          <DayEditor
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onClose={() => setEditing(false)}
            saving={saving}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4">
      <div className="flex items-end gap-6">
        <CountBlock
          label="1日目"
          sub={formatDayLabel(day1)}
          value={c1}
          loading={loading}
        />
        {showDay2 && (
          <>
            <CountBlock
              label="2日目"
              sub={formatDayLabel(day2)}
              value={c2}
              loading={loading}
            />
            <div className="mb-5 h-8 w-px bg-white/10" />
            <CountBlock
              label="合計"
              sub="のべ"
              value={total}
              loading={loading}
              accent
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] text-slate-400">
        <span>来場者数（アプリを開いた端末の数）</span>
        <button
          onClick={refresh}
          className="rounded-md bg-white/5 px-2 py-0.5 text-slate-400 active:scale-95"
        >
          更新
        </button>
        <button
          onClick={openEditor}
          className="rounded-md bg-white/5 px-2 py-0.5 text-slate-400 active:scale-95"
        >
          日程を設定
        </button>
      </div>
      {error && (
        <p className="text-[12px] text-red-300">
          集計に失敗しました（Firestoreの権限設定を確認してください）
        </p>
      )}

      {editing && (
        <DayEditor
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onClose={() => setEditing(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

function DayEditor({
  draft,
  setDraft,
  onSave,
  onClose,
  saving,
}: {
  draft: string[];
  setDraft: (v: string[]) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-slate-900 p-4 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold">文化祭の開催日</h2>
        <p className="mb-4 text-xs text-slate-400">
          ここで設定した日付ごとに来場者数を集計します。
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-slate-400">1日目</span>
          <input
            type="date"
            value={draft[0] ?? ""}
            onChange={(e) => setDraft([e.target.value, draft[1] ?? ""])}
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-slate-400">
            2日目（1日だけの場合は空欄）
          </span>
          <input
            type="date"
            value={draft[1] ?? ""}
            onChange={(e) => setDraft([draft[0] ?? "", e.target.value])}
            className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-sm"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving || !draft[0]}
            className="flex-1 rounded-lg bg-emerald-500 p-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-white/10 p-3 text-sm active:scale-95"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
