"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Announcement,
  BOOTH_TYPE_LABELS,
  Booth,
  BoothGenre,
  GENRE_LABELS,
  getAnnouncements,
  getBoothByToken,
  sendEmergencyAlert,
  updateBooth,
} from "@/lib/booth";

const GENRE_OPTIONS = Object.keys(GENRE_LABELS) as BoothGenre[];

export default function BoothManagePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [booth, setBooth] = useState<Booth | null | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<BoothGenre | "">("");
  const [waitingGroups, setWaitingGroups] = useState(0);
  const [timePerGroup, setTimePerGroup] = useState<number | "">("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingWait, setSavingWait] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [waitSaved, setWaitSaved] = useState(false);

  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencySending, setEmergencySending] = useState(false);
  const [emergencySent, setEmergencySent] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!token) return;
    getBoothByToken(token).then((b) => {
      setBooth(b);
      if (b) {
        setDescription(b.description);
        setGenre(b.genre ?? "");
        setWaitingGroups(b.waitingGroups ?? 0);
        setTimePerGroup(b.timePerGroup ?? "");
      }
    });
    getAnnouncements().then(setAnnouncements);
  }, [token]);

  async function saveInfo() {
    if (!booth) return;
    setSavingInfo(true);
    setInfoSaved(false);
    const isSetupDone = description.trim() !== "" && genre !== "";
    await updateBooth(booth.id, {
      description,
      genre: genre === "" ? null : genre,
      isSetupDone,
    });
    setBooth({ ...booth, description, genre: genre === "" ? null : genre, isSetupDone });
    setSavingInfo(false);
    setInfoSaved(true);
  }

  async function saveWait() {
    if (!booth) return;
    setSavingWait(true);
    setWaitSaved(false);
    await updateBooth(booth.id, {
      waitingGroups,
      timePerGroup: timePerGroup === "" ? null : timePerGroup,
    });
    setBooth({
      ...booth,
      waitingGroups,
      timePerGroup: timePerGroup === "" ? null : timePerGroup,
    });
    setSavingWait(false);
    setWaitSaved(true);
  }

  async function submitEmergency() {
    if (!booth) return;
    setEmergencySending(true);
    await sendEmergencyAlert({
      boothId: booth.id,
      boothName: booth.name,
      message: emergencyMessage,
    });
    setEmergencySending(false);
    setEmergencySent(true);
    setEmergencyOpen(false);
    setEmergencyMessage("");
  }

  if (booth === undefined) {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 text-white">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (booth === null) {
    return (
      <div className="mx-auto max-w-md px-4 pt-8 text-white">
        <p className="text-sm text-red-400">
          このURLは無効です。企画担当のQRコード／URLを再度ご確認ください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 text-white">
      <p className="animate-fade-in-up mb-1 text-xs text-slate-500">
        企画管理ページ
      </p>
      <h1 className="animate-fade-in-up mb-4 text-2xl font-bold">{booth.name}</h1>

      {!booth.isSetupDone && (
        <div
          className="animate-fade-in-up mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200"
          style={{ animationDelay: "40ms" }}
        >
          企画情報の入力が完了していません。説明文とカテゴリを入力してください。
        </div>
      )}

      <section
        className="animate-fade-in-up mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "80ms" }}
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-300">基本情報</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">区分</dt>
            <dd>{BOOTH_TYPE_LABELS[booth.type] ?? booth.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">場所</dt>
            <dd>
              {booth.location
                ? `${booth.location}${booth.floor ? ` ${booth.floor}F` : ""}`
                : "未設定（運営にて設定予定）"}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="animate-fade-in-up mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          説明文・カテゴリ
        </h2>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-slate-500">カテゴリ</span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as BoothGenre)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
          >
            <option value="">選択してください</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {GENRE_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-slate-500">説明文</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="来場者向けの企画説明を入力してください"
            className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
          />
        </label>
        <button
          onClick={saveInfo}
          disabled={savingInfo}
          className="w-full rounded-lg bg-white/10 p-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
        >
          {savingInfo ? "保存中..." : "保存する"}
        </button>
        {infoSaved && (
          <p className="mt-2 text-xs text-emerald-400">保存しました</p>
        )}
      </section>

      {booth.hasWaiting && (
        <section
          className="animate-fade-in-up mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
          style={{ animationDelay: "160ms" }}
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            待ち状況
          </h2>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-500">
              現在の待ちグループ数
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWaitingGroups((v) => Math.max(0, v - 1))}
                className="h-9 w-9 rounded-lg bg-white/10 text-lg active:scale-95"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-semibold">
                {waitingGroups}
              </span>
              <button
                onClick={() => setWaitingGroups((v) => v + 1)}
                className="h-9 w-9 rounded-lg bg-white/10 text-lg active:scale-95"
              >
                ＋
              </button>
            </div>
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-500">
              1グループあたりの所要時間（分）
            </span>
            <input
              type="number"
              min={0}
              value={timePerGroup}
              onChange={(e) =>
                setTimePerGroup(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
            />
          </label>
          <button
            onClick={saveWait}
            disabled={savingWait}
            className="w-full rounded-lg bg-white/10 p-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
          >
            {savingWait ? "更新中..." : "待ち状況を更新する"}
          </button>
          {waitSaved && (
            <p className="mt-2 text-xs text-emerald-400">更新しました</p>
          )}
        </section>
      )}

      <section
        className="animate-fade-in-up mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          スタンプラリー用QRコード
        </h2>
        <p className="text-xs text-slate-500">
          QRコード表示機能は準備中です。運営にお問い合わせください。
        </p>
      </section>

      <section
        className="animate-fade-in-up mb-4 rounded-xl border border-white/10 bg-white/5 p-4"
        style={{ animationDelay: "240ms" }}
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          運営からのお知らせ
        </h2>
        {announcements.length === 0 ? (
          <p className="text-xs text-slate-500">現在お知らせはありません</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {announcements.map((a) => (
              <li key={a.id} className="border-b border-white/5 pb-2 last:border-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-slate-400">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="animate-fade-in-up rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        style={{ animationDelay: "280ms" }}
      >
        <h2 className="mb-2 text-sm font-semibold text-red-200">緊急連絡</h2>
        {emergencySent && !emergencyOpen && (
          <p className="mb-2 text-xs text-emerald-400">
            運営へ通知を送信しました
          </p>
        )}
        {emergencyOpen ? (
          <div>
            <textarea
              value={emergencyMessage}
              onChange={(e) => setEmergencyMessage(e.target.value)}
              rows={3}
              placeholder="状況を簡潔に入力してください（空欄でも送信できます）"
              className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={submitEmergency}
                disabled={emergencySending}
                className="flex-1 rounded-lg bg-red-500 p-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                {emergencySending ? "送信中..." : "運営へ送信する"}
              </button>
              <button
                onClick={() => setEmergencyOpen(false)}
                className="rounded-lg bg-white/10 p-2 px-4 text-sm active:scale-95"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setEmergencyOpen(true);
              setEmergencySent(false);
            }}
            className="w-full rounded-lg bg-red-500 p-3 text-sm font-semibold text-white active:scale-95"
          >
            緊急連絡ボタン
          </button>
        )}
      </section>
    </div>
  );
}
