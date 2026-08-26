"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  VisitorRule,
  createVisitorRule,
  deleteVisitorRule,
  subscribeVisitorRules,
  updateVisitorRule,
} from "@/lib/booth";

function RuleEditor({
  rule,
  onSave,
  onDelete,
}: {
  rule: VisitorRule;
  onSave: (fields: { heading: string; text: string; order: number }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [heading, setHeading] = useState(rule.heading);
  const [text, setText] = useState(rule.text);
  const [order, setOrder] = useState(rule.order);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ heading, text, order });
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">
            {rule.order}. {rule.heading}
          </p>
          <div className="flex shrink-0 gap-2 text-xs text-neutral-400">
            <button onClick={() => setEditing(true)}>編集</button>
            <button onClick={onDelete}>削除</button>
          </div>
        </div>
        <p className="mt-1 text-xs text-neutral-400">{rule.text}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-3 text-sm">
      <div className="mb-2 flex gap-2">
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="w-16 rounded-md border border-white/15 bg-transparent p-2 text-sm"
        />
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="flex-1 rounded-md border border-white/15 bg-transparent p-2 text-sm"
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="mb-2 w-full rounded-md border border-white/15 bg-transparent p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !heading.trim()}
          className="flex-1 rounded-md bg-white p-2 text-xs font-medium text-neutral-950 transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
        <button
          onClick={() => {
            setHeading(rule.heading);
            setText(rule.text);
            setOrder(rule.order);
            setEditing(false);
          }}
          className="flex-1 rounded-md border border-white/15 p-2 text-xs text-neutral-300 transition-colors hover:border-white/35 hover:text-white active:scale-[0.99]"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function OrganizerVisitorInfoPage() {
  const [rules, setRules] = useState<VisitorRule[]>([]);
  const [heading, setHeading] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeVisitorRules(setRules), []);

  async function submit() {
    if (!heading.trim()) return;
    setSaving(true);
    const nextOrder = rules.length > 0 ? Math.max(...rules.map((r) => r.order)) + 1 : 1;
    await createVisitorRule({ heading, text, order: nextOrder });
    setHeading("");
    setText("");
    setSaving(false);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 text-white sm:max-w-xl">
      <div className="mb-4">
        <h1 className="text-[15px] font-medium tracking-[0.08em] text-neutral-100">
          渦潮祭
        </h1>
        <p className="text-[12px] tracking-[0.14em] text-neutral-500">
          ORGANIZER ・ 来場者の皆さんへ
        </p>
      </div>

      <Link href="/organizer" className="mb-4 inline-block text-xs text-neutral-400 underline">
        ← 運営ダッシュボードへ戻る
      </Link>

      <section className="rounded-xl border border-white/12 bg-neutral-950/70 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">
          来場者の皆さんへ（校内ルール・注意事項）
        </h2>

        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="見出し（例：飲食について）"
          className="mb-2 w-full rounded-md border border-white/15 bg-transparent p-2 text-sm"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="本文"
          className="mb-2 w-full rounded-md border border-white/15 bg-transparent p-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={saving || !heading.trim()}
          className="mb-4 w-full rounded-md bg-white p-2.5 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "追加中..." : "新しい項目を追加"}
        </button>

        <div className="space-y-2">
          {rules.length === 0 && (
            <p className="text-xs text-neutral-500">まだ項目がありません</p>
          )}
          {rules.map((rule) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              onSave={(fields) => updateVisitorRule(rule.id, fields)}
              onDelete={() => deleteVisitorRule(rule.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
