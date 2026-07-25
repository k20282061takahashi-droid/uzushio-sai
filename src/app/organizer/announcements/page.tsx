"use client";

import { useEffect, useState } from "react";
import {
  Announcement,
  createStaffAnnouncement,
  createVisitorAnnouncement,
  deleteStaffAnnouncement,
  deleteVisitorAnnouncement,
  setStaffAnnouncementPinned,
  setVisitorAnnouncementPinned,
  subscribeStaffAnnouncements,
  subscribeVisitorAnnouncements,
  updateStaffAnnouncement,
  updateVisitorAnnouncement,
} from "@/lib/booth";

function AnnouncementEditor({
  announcement,
  onSave,
  onDelete,
  onTogglePinned,
}: {
  announcement: Announcement;
  onSave: (fields: { title: string; body: string; pinned: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
  onTogglePinned: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ title, body, pinned: announcement.pinned });
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="rounded-lg bg-white/5 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-start gap-1 font-medium">
            {announcement.pinned && <span className="shrink-0 text-amber-400">📌</span>}
            <span>{announcement.title}</span>
          </p>
          <div className="flex shrink-0 gap-2 text-xs text-slate-400">
            <button onClick={() => setEditing(true)}>編集</button>
            <button onClick={onTogglePinned}>
              {announcement.pinned ? "ピン解除" : "ピン留め"}
            </button>
            <button onClick={onDelete}>削除</button>
          </div>
        </div>
        {announcement.body && (
          <p className="mt-1 text-xs text-slate-400">{announcement.body}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/5 p-3 text-sm">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !title.trim()}
          className="flex-1 rounded-lg bg-white/10 p-2 text-xs font-semibold active:scale-95 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
        <button
          onClick={() => {
            setTitle(announcement.title);
            setBody(announcement.body);
            setEditing(false);
          }}
          className="flex-1 rounded-lg bg-white/5 p-2 text-xs active:scale-95"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function AnnouncementSection({
  heading,
  announcements,
  onCreate,
  onSave,
  onDelete,
  onTogglePinned,
}: {
  heading: string;
  announcements: Announcement[];
  onCreate: (input: { title: string; body: string; pinned: boolean }) => Promise<void>;
  onSave: (id: string, fields: { title: string; body: string; pinned: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePinned: (id: string, pinned: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate({ title, body, pinned });
    setTitle("");
    setBody("");
    setPinned(false);
    setSaving(false);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">{heading}</h2>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="本文（任意）"
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
      />
      <label className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
        />
        ピン留めする
      </label>
      <button
        onClick={submit}
        disabled={saving || !title.trim()}
        className="mb-4 w-full rounded-lg bg-white/10 p-2 text-sm font-semibold active:scale-95 disabled:opacity-50"
      >
        {saving ? "送信中..." : "新規に送信する"}
      </button>

      <div className="space-y-2">
        {announcements.length === 0 && (
          <p className="text-xs text-slate-500">まだお知らせはありません</p>
        )}
        {announcements.map((a) => (
          <AnnouncementEditor
            key={a.id}
            announcement={a}
            onSave={(fields) => onSave(a.id, fields)}
            onDelete={() => onDelete(a.id)}
            onTogglePinned={() => onTogglePinned(a.id, !a.pinned)}
          />
        ))}
      </div>
    </section>
  );
}

export default function OrganizerAnnouncementsPage() {
  const [staff, setStaff] = useState<Announcement[]>([]);
  const [visitor, setVisitor] = useState<Announcement[]>([]);

  useEffect(() => subscribeStaffAnnouncements(setStaff), []);
  useEffect(() => subscribeVisitorAnnouncements(setVisitor), []);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 text-white sm:max-w-3xl">
      <div className="mb-4">
        <h1 className="text-sm font-bold text-slate-300">渦潮祭</h1>
        <p className="text-xs text-slate-500">運営用 ・ お知らせ編集</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AnnouncementSection
          heading="企画担当者への連絡"
          announcements={staff}
          onCreate={createStaffAnnouncement}
          onSave={updateStaffAnnouncement}
          onDelete={deleteStaffAnnouncement}
          onTogglePinned={setStaffAnnouncementPinned}
        />
        <AnnouncementSection
          heading="来場者へのお知らせ"
          announcements={visitor}
          onCreate={createVisitorAnnouncement}
          onSave={updateVisitorAnnouncement}
          onDelete={deleteVisitorAnnouncement}
          onTogglePinned={setVisitorAnnouncementPinned}
        />
      </div>
    </div>
  );
}
