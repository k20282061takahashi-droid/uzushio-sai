"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Announcement,
  Booth,
  BoothGenre,
  BoothStatus,
  GENRE_LABELS,
  getAnnouncements,
  getBoothByToken,
  registerLostItem,
  sendEmergencyAlert,
  updateBooth,
  uploadSignboardImage,
} from "@/lib/booth";

const GENRE_OPTIONS = Object.keys(GENRE_LABELS) as BoothGenre[];

function visitorStatusLabel(booth: Booth): string {
  if (booth.status === "closed") return "終了";
  if (booth.status === "break") return "休憩中";
  if (booth.hasWaiting && booth.timePerGroup) {
    const minutes = (booth.waitingGroups ?? 0) * booth.timePerGroup;
    return `待ち時間 ${minutes}分`;
  }
  return "開催中";
}

export default function BoothManagePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [booth, setBooth] = useState<Booth | null | undefined>(undefined);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);

  // セットアップ用フォーム
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<BoothGenre | "">("");
  const [timePerGroup, setTimePerGroup] = useState<number | "">("");
  const [uploadingSignboard, setUploadingSignboard] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);

  const [waitingGroups, setWaitingGroups] = useState(0);
  const [savingWait, setSavingWait] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const [lostItemOpen, setLostItemOpen] = useState(false);
  const [lostItemDescription, setLostItemDescription] = useState("");
  const [lostItemSaving, setLostItemSaving] = useState(false);
  const [lostItemSaved, setLostItemSaved] = useState(false);

  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencySending, setEmergencySending] = useState(false);
  const [emergencySent, setEmergencySent] = useState(false);

  useEffect(() => {
    if (!token) return;
    getBoothByToken(token).then((b) => {
      setBooth(b);
      if (b) {
        setDescription(b.description);
        setGenre(b.genre ?? "");
        setTimePerGroup(b.timePerGroup ?? "");
        setWaitingGroups(b.waitingGroups ?? 0);
      }
    });
    getAnnouncements().then(setAnnouncements);
  }, [token]);

  async function saveSetup() {
    if (!booth) return;
    setSavingSetup(true);
    const isSetupDone = description.trim() !== "" && genre !== "";
    const fields = {
      description,
      genre: genre === "" ? null : genre,
      timePerGroup: timePerGroup === "" ? null : timePerGroup,
      isSetupDone,
    };
    await updateBooth(booth.id, fields);
    setBooth({ ...booth, ...fields });
    setSavingSetup(false);
  }

  async function handleSignboardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !booth) return;
    setUploadingSignboard(true);
    const url = await uploadSignboardImage(booth.id, file);
    await updateBooth(booth.id, { signboardUrl: url });
    setBooth({ ...booth, signboardUrl: url });
    setUploadingSignboard(false);
  }

  async function adjustWaiting(delta: number) {
    if (!booth) return;
    const next = Math.max(0, waitingGroups + delta);
    setWaitingGroups(next);
    setSavingWait(true);
    await updateBooth(booth.id, { waitingGroups: next });
    setBooth({ ...booth, waitingGroups: next });
    setSavingWait(false);
  }

  async function changeStatus(status: BoothStatus) {
    if (!booth) return;
    setChangingStatus(true);
    await updateBooth(booth.id, { status });
    setBooth({ ...booth, status });
    setChangingStatus(false);
    setConfirmClose(false);
  }

  async function submitLostItem() {
    if (!booth) return;
    setLostItemSaving(true);
    await registerLostItem({
      boothId: booth.id,
      boothName: booth.name,
      description: lostItemDescription,
    });
    setLostItemSaving(false);
    setLostItemSaved(true);
    setLostItemOpen(false);
    setLostItemDescription("");
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
      <h1 className="mb-1 text-2xl font-bold">渦潮祭</h1>
      <p className="mb-2 text-xs text-slate-500">企画管理者用</p>
      <p className="mb-4 text-lg font-semibold">{booth.name}</p>

      {/* 運営からの連絡 */}
      <section className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">運営からの連絡</h2>
          {!showAllAnnouncements && announcements.length > 1 && (
            <button
              onClick={() => setShowAllAnnouncements(true)}
              className="text-xs text-slate-400"
            >
              +{announcements.length - 1}
            </button>
          )}
        </div>
        {showAllAnnouncements && (
          <button
            onClick={() => setShowAllAnnouncements(false)}
            className="mb-2 text-xs text-slate-400"
          >
            ← Back
          </button>
        )}
        {announcements.length === 0 ? (
          <p className="text-xs text-slate-500">現在お知らせはありません</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(showAllAnnouncements ? announcements : announcements.slice(0, 1)).map(
              (a) => (
                <li key={a.id} className="border-b border-white/5 pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{a.title || a.body}</p>
                  </div>
                  {a.title && <p className="text-xs text-slate-400">{a.body}</p>}
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {!booth.isSetupDone ? (
        <section className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-amber-200">
            企画情報の設定
          </h2>

          {booth.hasWaiting && (
            <label className="mb-3 block">
              <span className="mb-1 block text-xs text-slate-400">
                1グループあたりの対応時間（分）
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
          )}

          <div className="mb-3">
            <span className="mb-1 block text-xs text-slate-400">看板画像</span>
            <div className="mb-1 flex items-center gap-2">
              {booth.signboardUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booth.signboardUrl}
                  alt="看板画像"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-900 text-[10px] text-slate-500">
                  未設定
                </div>
              )}
              <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs">
                {uploadingSignboard ? "アップロード中..." : "画像を選択"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignboardChange}
                  className="hidden"
                  disabled={uploadingSignboard}
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-500">ロックされていません</p>
          </div>

          <div className="mb-3 flex justify-between text-sm">
            <span className="text-xs text-slate-400">企画名</span>
            <span>{booth.name}</span>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">カテゴリー</span>
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
            <span className="mb-1 block text-xs text-slate-400">詳細</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="来場者向けの企画説明を入力してください"
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
            />
          </label>

          <button
            onClick={saveSetup}
            disabled={savingSetup}
            className="w-full rounded-lg bg-white/10 p-2 text-sm font-semibold active:scale-95 disabled:opacity-50"
          >
            {savingSetup ? "保存中..." : "保存する"}
          </button>
        </section>
      ) : (
        <section className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 rounded-lg bg-white/5 p-2 text-center">
            <p className="text-xs text-slate-400">来場者表示</p>
            <p className="font-semibold">{visitorStatusLabel(booth)}</p>
          </div>

          {booth.hasWaiting && (
            <div className="mb-4 flex items-center justify-center gap-6">
              <button
                onClick={() => adjustWaiting(-1)}
                disabled={savingWait || booth.status !== "open"}
                className="h-12 w-12 rounded-lg bg-white/10 text-xl active:scale-95 disabled:opacity-40"
              >
                −
              </button>
              <div className="text-center">
                <p className="text-xs text-slate-500">待ち</p>
                <p className="text-5xl font-bold">{waitingGroups}</p>
              </div>
              <button
                onClick={() => adjustWaiting(1)}
                disabled={savingWait || booth.status !== "open"}
                className="h-12 w-12 rounded-lg bg-white/10 text-xl active:scale-95 disabled:opacity-40"
              >
                ＋
              </button>
            </div>
          )}

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setConfirmClose(true)}
              disabled={changingStatus || booth.status === "closed"}
              className="flex-1 rounded-lg bg-red-500/20 p-2 text-sm font-semibold text-red-200 active:scale-95 disabled:opacity-40"
            >
              終了
            </button>
            {booth.status === "break" ? (
              <button
                onClick={() => changeStatus("open")}
                disabled={changingStatus}
                className="flex-1 rounded-lg bg-emerald-500/20 p-2 text-sm font-semibold text-emerald-200 active:scale-95"
              >
                再開
              </button>
            ) : (
              <button
                onClick={() => changeStatus("break")}
                disabled={changingStatus || booth.status !== "open"}
                className="flex-1 rounded-lg bg-white/10 p-2 text-sm font-semibold active:scale-95 disabled:opacity-40"
              >
                一時休憩
              </button>
            )}
          </div>

          {confirmClose && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="mb-2 text-center text-sm font-semibold">
                本当に終了しますか
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => changeStatus("closed")}
                  disabled={changingStatus}
                  className="flex-1 rounded-lg bg-red-500 p-2 text-sm font-semibold text-white active:scale-95"
                >
                  終了
                </button>
                <button
                  onClick={() => setConfirmClose(false)}
                  className="flex-1 rounded-lg bg-white/10 p-2 text-sm active:scale-95"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {lostItemOpen ? (
            <div>
              <textarea
                value={lostItemDescription}
                onChange={(e) => setLostItemDescription(e.target.value)}
                rows={2}
                placeholder="拾得物の内容を入力してください"
                className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitLostItem}
                  disabled={lostItemSaving}
                  className="flex-1 rounded-lg bg-amber-500/80 p-2 text-sm font-semibold text-slate-950 active:scale-95 disabled:opacity-50"
                >
                  {lostItemSaving ? "登録中..." : "登録する"}
                </button>
                <button
                  onClick={() => setLostItemOpen(false)}
                  className="rounded-lg bg-white/10 p-2 px-4 text-sm active:scale-95"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setLostItemOpen(true);
                setLostItemSaved(false);
              }}
              className="w-full rounded-lg bg-amber-500/20 p-2 text-sm font-semibold text-amber-200 active:scale-95"
            >
              落とし物登録
            </button>
          )}
          {lostItemSaved && !lostItemOpen && (
            <p className="mt-2 text-xs text-emerald-400">登録しました</p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <h2 className="mb-2 text-sm font-semibold text-red-200">緊急連絡</h2>
        {emergencySent && !emergencyOpen && (
          <p className="mb-2 text-xs text-emerald-400">運営へ通知を送信しました</p>
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
