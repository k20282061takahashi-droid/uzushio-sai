"use client";

import { useEffect, useMemo, useState } from "react";
import FloatPanel from "./FloatPanel";
import { PinIcon } from "../Icon";
import {
  type Announcement,
  type Booth,
  createStaffAnnouncement,
  createVisitorAnnouncement,
  deleteStaffAnnouncement,
  deleteVisitorAnnouncement,
  setStaffAnnouncementPinned,
  setVisitorAnnouncementPinned,
  subscribeBooths,
  subscribeStaffAnnouncements,
  subscribeVisitorAnnouncements,
  updateStaffAnnouncement,
  updateVisitorAnnouncement,
  type VisitorRule,
  createVisitorRule,
  updateVisitorRule,
  deleteVisitorRule,
  subscribeVisitorRules,
} from "@/lib/booth";

type Target = "visitor" | "staff" | "rules";

function formatTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 送り先の企画を選ぶ部分。建物ごとにまとめて探しやすくしている。
export function BoothPicker({
  booths,
  selected,
  onChange,
}: {
  booths: Booth[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  // 建物・会場ごとにまとめる
  const groups = useMemo(() => {
    const map = new Map<string, Booth[]>();
    for (const b of booths) {
      const key = b.location || "場所未設定";
      const list = map.get(key);
      if (list) list.push(b);
      else map.set(key, [b]);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aUnset = a[0] === "場所未設定";
      const bUnset = b[0] === "場所未設定";
      if (aUnset !== bUnset) return aUnset ? 1 : -1;
      return a[0].localeCompare(b[0], "ja");
    });
  }, [booths]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleGroup(list: Booth[]) {
    const allOn = list.every((b) => selected.has(b.id));
    const next = new Set(selected);
    for (const b of list) {
      if (allOn) next.delete(b.id);
      else next.add(b.id);
    }
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => onChange(new Set(booths.map((b) => b.id)))}
          className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-medium active:scale-95"
        >
          すべて選択
        </button>
        <button
          onClick={() => onChange(new Set())}
          className="rounded-lg bg-white/5 px-3.5 py-2 text-sm text-neutral-300 active:scale-95"
        >
          選択を解除
        </button>
        <p className="ml-auto text-xs text-neutral-400">
          {selected.size === 0
            ? "未選択"
            : selected.size === booths.length
              ? `全企画（${booths.length}件）`
              : `${selected.size}件を選択中`}
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-neutral-950/50 p-2">
        {groups.map(([location, list]) => {
          const allOn = list.every((b) => selected.has(b.id));
          return (
            <div key={location} className="mb-3 last:mb-0">
              <button
                onClick={() => toggleGroup(list)}
                className="mb-1 flex w-full items-center gap-2 text-left text-xs font-bold text-neutral-300"
              >
                <span
                  className={`inline-block h-3 w-3 rounded-sm border ${
                    allOn ? "border-emerald-400 bg-emerald-400" : "border-white/30"
                  }`}
                />
                {location}
                <span className="font-normal text-neutral-400">
                  ({list.length}件)
                </span>
              </button>
              <div className="grid grid-cols-2 gap-1 pl-5 lg:grid-cols-3">
                {list.map((b) => (
                  <label
                    key={b.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs text-neutral-300 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={() => toggle(b.id)}
                      className="accent-emerald-500"
                    />
                    <span className="truncate">
                      {b.name}
                      {b.projectName ? `（${b.projectName}）` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 「来場者の皆さんへ」（校内ルール・注意事項）の編集部分
function VisitorRulesEditor() {
  const [rules, setRules] = useState<VisitorRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heading, setHeading] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => subscribeVisitorRules(setRules), []);

  function reset() {
    setEditingId(null);
    setHeading("");
    setText("");
    setDone(false);
  }

  function startEdit(rule: VisitorRule) {
    setEditingId(rule.id);
    setHeading(rule.heading);
    setText(rule.text);
    setDone(false);
  }

  async function submit() {
    if (!heading.trim()) return;
    setSaving(true);
    if (editingId) {
      const current = rules.find((r) => r.id === editingId);
      await updateVisitorRule(editingId, {
        heading,
        text,
        order: current?.order ?? rules.length + 1,
      });
    } else {
      const nextOrder =
        rules.length > 0 ? Math.max(...rules.map((r) => r.order)) + 1 : 1;
      await createVisitorRule({ heading, text, order: nextOrder });
    }
    setSaving(false);
    reset();
    setDone(true);
  }

  // 並び順を1つ上／下に入れ替える
  async function move(rule: VisitorRule, direction: -1 | 1) {
    const index = rules.findIndex((r) => r.id === rule.id);
    const swapWith = rules[index + direction];
    if (!swapWith) return;
    await updateVisitorRule(rule.id, {
      heading: rule.heading,
      text: rule.text,
      order: swapWith.order,
    });
    await updateVisitorRule(swapWith.id, {
      heading: swapWith.heading,
      text: swapWith.text,
      order: rule.order,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 左：作成・編集 */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-neutral-300">
          {editingId ? "案内を編集する" : "新しい案内を作る"}
        </h3>
        <p className="mb-3 text-[13px] text-neutral-400">
          来場者アプリの「来場者の皆さんへ」に表示されます。
          タイトルは全文表示され、本文は長い場合に途中まで表示されます。
        </p>

        <input
          type="text"
          value={heading}
          onChange={(e) => {
            setHeading(e.target.value);
            setDone(false);
          }}
          placeholder="タイトル（例：校内は全面禁煙です）"
          className="mb-2 w-full rounded-lg border border-white/10 bg-neutral-950 p-3 text-sm"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="本文。改行するとそのまま反映されます。"
          className="mb-3 w-full rounded-lg border border-white/10 bg-neutral-950 p-3 text-sm"
        />

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={saving || !heading.trim()}
            className="flex-1 rounded-lg bg-emerald-500 p-3 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
          >
            {saving ? "保存中..." : editingId ? "保存する" : "追加する"}
          </button>
          {editingId && (
            <button
              onClick={reset}
              className="rounded-lg bg-white/10 px-5 text-sm active:scale-95"
            >
              やめる
            </button>
          )}
        </div>
        {done && <p className="mt-2 text-sm text-emerald-400">保存しました</p>}
      </section>

      {/* 右：一覧 */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-neutral-300">
          いまの案内（{rules.length}件）
        </h3>
        {rules.length === 0 ? (
          <p className="text-sm text-neutral-400">まだ登録されていません</p>
        ) : (
          <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {rules.map((rule, i) => (
              <li
                key={rule.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-bold">{rule.heading}</p>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-[13px] text-neutral-400">
                  {rule.text}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => startEdit(rule)}
                    className="rounded-md bg-white/10 px-3 py-1.5 text-[13px] active:scale-95"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => move(rule, -1)}
                    disabled={i === 0}
                    className="rounded-md bg-white/10 px-3 py-1.5 text-[13px] active:scale-95 disabled:opacity-30"
                  >
                    ↑ 上へ
                  </button>
                  <button
                    onClick={() => move(rule, 1)}
                    disabled={i === rules.length - 1}
                    className="rounded-md bg-white/10 px-3 py-1.5 text-[13px] active:scale-95 disabled:opacity-30"
                  >
                    ↓ 下へ
                  </button>
                  <button
                    onClick={() => deleteVisitorRule(rule.id)}
                    className="ml-auto rounded-md bg-red-500/20 px-3 py-1.5 text-[13px] text-red-200 active:scale-95"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AnnouncementFloat({
  open,
  onClose,
  initialTarget = "visitor",
}: {
  open: boolean;
  onClose: () => void;
  initialTarget?: Target;
}) {
  const [target, setTarget] = useState<Target>(initialTarget);
  const [visitorList, setVisitorList] = useState<Announcement[]>([]);
  const [staffList, setStaffList] = useState<Announcement[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);

  // 入力中の内容
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => subscribeVisitorAnnouncements(setVisitorList), []);
  useEffect(() => subscribeStaffAnnouncements(setStaffList), []);
  useEffect(() => subscribeBooths(setBooths), []);

  const list = target === "staff" ? staffList : visitorList;

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setPinned(false);
    setSendToAll(true);
    setSelected(new Set());
    setDone(false);
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setPinned(a.pinned);
    setSendToAll(a.targetBoothIds === null);
    setSelected(new Set(a.targetBoothIds ?? []));
    setDone(false);
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);

    const targetBoothIds =
      target === "staff" && !sendToAll ? Array.from(selected) : null;

    if (editingId) {
      if (target === "visitor") {
        await updateVisitorAnnouncement(editingId, { title, body, pinned });
      } else {
        await updateStaffAnnouncement(editingId, { title, body, pinned });
      }
    } else if (target === "visitor") {
      await createVisitorAnnouncement({ title, body, pinned });
    } else {
      await createStaffAnnouncement({ title, body, pinned, targetBoothIds });
    }

    setSaving(false);
    setDone(true);
    resetForm();
    setDone(true);
  }

  async function remove(id: string) {
    if (target === "visitor") await deleteVisitorAnnouncement(id);
    else await deleteStaffAnnouncement(id);
    if (editingId === id) resetForm();
  }

  async function togglePin(a: Announcement) {
    if (target === "visitor") await setVisitorAnnouncementPinned(a.id, !a.pinned);
    else await setStaffAnnouncementPinned(a.id, !a.pinned);
  }

  function targetSummary(a: Announcement): string {
    if (target === "visitor") return "来場者全員";
    if (a.targetBoothIds === null) return "全企画";
    const names = a.targetBoothIds
      .map((id) => booths.find((b) => b.id === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return "宛先なし";
    if (names.length <= 2) return names.join("・");
    return `${names.slice(0, 2).join("・")} ほか${names.length - 2}件`;
  }

  const canSubmit =
    title.trim().length > 0 &&
    (target === "visitor" || sendToAll || selected.size > 0);

  return (
    <FloatPanel
      open={open}
      title="連絡"
      subtitle="来場者アプリのお知らせと、企画担当者への連絡をここで管理します"
      onClose={onClose}
      width="wide"
    >
      {/* 送り先の切り替え */}
      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "visitor", label: "来場者へのお知らせ" },
            { key: "staff", label: "企画担当者への連絡" },
            { key: "rules", label: "来場者への案内（校内ルール）" },
          ] as { key: Target; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTarget(t.key);
              resetForm();
            }}
            className={
              target === t.key
                ? "rounded-lg bg-white px-4 py-2 text-sm font-bold text-neutral-950"
                : "rounded-lg bg-white/10 px-4 py-2 text-sm text-neutral-300"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {target === "rules" ? (
        <VisitorRulesEditor />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左：作成・編集 */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-neutral-300">
            {editingId ? "連絡を編集する" : "新しい連絡を作る"}
          </h3>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDone(false);
            }}
            placeholder="タイトル"
            className="mb-2 w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="本文（任意）"
            className="mb-2 w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />

          <label className="mb-3 flex items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-amber-400"
            />
            ピン留めする（一覧の一番上に固定されます）
          </label>

          {/* 企画担当者向けのときだけ、宛先を選べるようにする */}
          {target === "staff" && !editingId && (
            <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-300">送り先</p>
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setSendToAll(true)}
                  className={
                    sendToAll
                      ? "flex-1 rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-neutral-950"
                      : "flex-1 rounded-lg bg-white/10 px-3.5 py-2 text-sm text-neutral-300"
                  }
                >
                  すべての企画へ
                </button>
                <button
                  onClick={() => setSendToAll(false)}
                  className={
                    !sendToAll
                      ? "flex-1 rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-neutral-950"
                      : "flex-1 rounded-lg bg-white/10 px-3.5 py-2 text-sm text-neutral-300"
                  }
                >
                  企画を選んで送る
                </button>
              </div>
              {!sendToAll && (
                <BoothPicker
                  booths={booths}
                  selected={selected}
                  onChange={setSelected}
                />
              )}
            </div>
          )}

          {target === "staff" && editingId && (
            <p className="mb-3 text-xs text-neutral-400">
              ※ 送り先は作成時に決まります。変更したい場合は削除して作り直してください。
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving || !canSubmit}
              className="flex-1 rounded-lg bg-emerald-500 p-2.5 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
            >
              {saving ? "保存中..." : editingId ? "保存する" : "送信する"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="rounded-lg bg-white/10 px-4 text-sm active:scale-95"
              >
                やめる
              </button>
            )}
          </div>
          {done && (
            <p className="mt-2 text-xs text-emerald-400">保存しました</p>
          )}
        </section>

        {/* 右：送信済み一覧 */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-neutral-300">
            送信済みの連絡（{list.length}件）
          </h3>
          {list.length === 0 ? (
            <p className="text-xs text-neutral-400">まだ送信していません</p>
          ) : (
            <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {[...list]
                .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                .map((a) => (
                  <li
                    key={a.id}
                    className={`rounded-lg border p-3 text-sm ${
                      a.pinned
                        ? "border-amber-400/30 bg-amber-400/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {a.pinned && (
                            <PinIcon className="mr-1 inline h-4 w-4 text-amber-400" />
                          )}
                          {a.title}
                        </p>
                        {a.body && (
                          <p className="mt-1 text-xs text-neutral-400">{a.body}</p>
                        )}
                        <p className="mt-1 text-[13px] text-neutral-400">
                          {formatTime(a.createdAt)} ・ {targetSummary(a)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={() => startEdit(a)}
                        className="rounded-md bg-white/10 px-3 py-1.5 text-[13px] active:scale-95"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => togglePin(a)}
                        className="rounded-md bg-white/10 px-3 py-1.5 text-[13px] active:scale-95"
                      >
                        {a.pinned ? "ピン留めを外す" : "ピン留め"}
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="ml-auto rounded-md bg-red-500/20 px-3 py-1.5 text-[13px] text-red-200 active:scale-95"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
      )}
    </FloatPanel>
  );
}
