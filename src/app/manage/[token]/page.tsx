"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Announcement,
  Booth,
  BoothGenre,
  BoothStatus,
  FestivalPhase,
  GENRE_LABELS,
  getBoothByToken,
  getStaffAnnouncements,
  registerLostItem,
  subscribeFestivalPhase,
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

function AnnouncementBoard({
  announcements,
  onOpenList,
}: {
  announcements: Announcement[];
  onOpenList: () => void;
}) {
  const pinned = announcements.filter((a) => a.pinned);
  const latest = announcements.slice(0, 3);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    if (latest.length <= 1) return;
    const timer = setInterval(() => {
      setTickerIndex((i) => (i + 1) % latest.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [latest.length]);

  if (announcements.length === 0) {
    return <p className="text-xs text-slate-500">現在お知らせはありません</p>;
  }

  return (
    <button onClick={onOpenList} className="w-full text-left">
      {pinned.length > 0 && (
        <ul className="mb-2 space-y-1">
          {pinned.map((a) => (
            <li key={a.id} className="flex items-start gap-1 text-sm">
              <span className="shrink-0 text-amber-400">📌</span>
              <span>{a.title}</span>
            </li>
          ))}
        </ul>
      )}
      {latest.length > 0 && (
        <div className="relative h-6 overflow-hidden text-sm text-slate-300">
          {latest.map((a, i) => (
            <span
              key={a.id}
              className="absolute inset-0 flex items-center transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(${(i - tickerIndex) * 100}%)` }}
            >
              {a.title}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

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
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-slate-900 p-4 shadow-xl sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function BoothManagePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [booth, setBooth] = useState<Booth | null | undefined>(undefined);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementListOpen, setAnnouncementListOpen] = useState(false);
  const [festivalPhase, setFestivalPhase] = useState<FestivalPhase>("before");

  // セットアップ用フォーム
  const [projectName, setProjectName] = useState("");
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
  const [lostItemFoundLocation, setLostItemFoundLocation] = useState("");
  const [lostItemStorageLocation, setLostItemStorageLocation] = useState("");
  const [lostItemPhoto, setLostItemPhoto] = useState<File | null>(null);
  const [lostItemPhotoPreview, setLostItemPhotoPreview] = useState<string | null>(null);
  const [lostItemSaving, setLostItemSaving] = useState(false);
  const [lostItemSaved, setLostItemSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    getBoothByToken(token).then((b) => {
      setBooth(b);
      if (b) {
        setProjectName(b.projectName ?? "");
        setDescription(b.description);
        setGenre(b.genre ?? "");
        setTimePerGroup(b.timePerGroup ?? "");
        setWaitingGroups(b.waitingGroups ?? 0);
      }
    });
    getStaffAnnouncements().then(setAnnouncements);
    const unsubscribe = subscribeFestivalPhase(setFestivalPhase);
    return unsubscribe;
  }, [token]);

  // 運営の全体スイッチで自動的に切り替わる。文化祭前は常に設定画面、
  // 文化祭中は設定が未完了でも強制的に運用画面を表示する。
  const view = festivalPhase === "during" ? "during" : "before";

  async function saveSetup() {
    if (!booth) return;
    setSavingSetup(true);
    const isSetupDone =
      projectName.trim() !== "" && description.trim() !== "" && genre !== "";
    const fields = {
      projectName,
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

  function openLostItemModal() {
    setLostItemDescription("");
    setLostItemFoundLocation("");
    setLostItemStorageLocation("");
    setLostItemPhoto(null);
    setLostItemPhotoPreview(null);
    setLostItemSaved(false);
    setLostItemOpen(true);
  }

  function handleLostItemPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLostItemPhoto(file);
    setLostItemPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submitLostItem() {
    if (!booth) return;
    setLostItemSaving(true);
    await registerLostItem(
      {
        boothId: booth.id,
        boothName: booth.name,
        description: lostItemDescription,
        foundLocation: lostItemFoundLocation,
        storageLocation: lostItemStorageLocation,
        photoUrl: null,
      },
      lostItemPhoto,
    );
    setLostItemSaving(false);
    setLostItemSaved(true);
    setLostItemOpen(false);
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
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 text-white sm:max-w-xl lg:max-w-3xl">
      <div className="mb-4">
        <h1 className="text-sm font-bold text-slate-300">渦潮祭</h1>
        <p className="text-xs text-slate-500">企画管理者用</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {booth.name}
        </p>
      </div>

      <section className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">運営からの連絡</h2>
        <AnnouncementBoard
          announcements={announcements}
          onOpenList={() => setAnnouncementListOpen(true)}
        />
      </section>

      {view === "before" ? (
        <section className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 sm:grid sm:grid-cols-2 sm:gap-x-6">
          <h2 className="mb-3 text-sm font-semibold text-amber-200 sm:col-span-2">
            企画情報の設定
          </h2>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">企画名</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="例）壊れるローラーコースター"
              className="w-full rounded-lg border border-white/10 bg-slate-900 p-2 text-sm"
            />
          </label>

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

          <label className="mb-3 block sm:col-span-2">
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
            className="w-full rounded-lg bg-white/10 p-2 text-sm font-semibold active:scale-95 disabled:opacity-50 sm:col-span-2"
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
            <div className="mb-4 flex items-center justify-between gap-3 sm:justify-center sm:gap-10">
              <button
                onClick={() => adjustWaiting(-1)}
                disabled={savingWait || booth.status !== "open"}
                className="h-24 w-24 shrink-0 rounded-2xl bg-white/10 text-4xl font-bold active:scale-95 disabled:opacity-40 sm:h-32 sm:w-32 sm:text-5xl"
              >
                −
              </button>
              <div className="flex-1 text-center sm:flex-none">
                <p className="text-xs text-slate-500">待っているグループ数</p>
                <p className="text-8xl font-bold tabular-nums sm:text-9xl">
                  {waitingGroups}
                </p>
              </div>
              <button
                onClick={() => adjustWaiting(1)}
                disabled={savingWait || booth.status !== "open"}
                className="h-24 w-24 shrink-0 rounded-2xl bg-white/10 text-4xl font-bold active:scale-95 disabled:opacity-40 sm:h-32 sm:w-32 sm:text-5xl"
              >
                ＋
              </button>
            </div>
          )}

          <div className="mb-3 flex flex-col gap-2 sm:grid sm:grid-cols-3">
            <button
              onClick={() => setConfirmClose(true)}
              disabled={changingStatus || booth.status === "closed"}
              className="flex-1 rounded-lg bg-red-500/20 p-3 text-sm font-semibold text-red-200 active:scale-95 disabled:opacity-40"
            >
              終了
            </button>
            {booth.status === "break" || booth.status === "closed" ? (
              <button
                onClick={() => changeStatus("open")}
                disabled={changingStatus}
                className="flex-1 rounded-lg bg-emerald-500/20 p-3 text-sm font-semibold text-emerald-200 active:scale-95"
              >
                再開
              </button>
            ) : (
              <button
                onClick={() => changeStatus("break")}
                disabled={changingStatus || booth.status !== "open"}
                className="flex-1 rounded-lg bg-white/10 p-3 text-sm font-semibold active:scale-95 disabled:opacity-40"
              >
                一時休憩
              </button>
            )}
            <button
              onClick={openLostItemModal}
              className="flex-1 rounded-lg bg-amber-500/20 p-3 text-sm font-semibold text-amber-200 active:scale-95"
            >
              落とし物登録
            </button>
          </div>
          {lostItemSaved && (
            <p className="mt-2 text-xs text-emerald-400">登録しました</p>
          )}
        </section>
      )}

      {confirmClose && (
        <Modal onClose={() => setConfirmClose(false)}>
          <p className="mb-4 text-center text-base font-semibold">
            本当に終了しますか
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => changeStatus("closed")}
              disabled={changingStatus}
              className="flex-1 rounded-lg bg-red-500 p-3 text-sm font-semibold text-white active:scale-95"
            >
              終了
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="flex-1 rounded-lg bg-white/10 p-3 text-sm active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {announcementListOpen && (
        <Modal onClose={() => setAnnouncementListOpen(false)}>
          <h2 className="mb-3 text-base font-semibold">運営からの連絡一覧</h2>
          {announcements.length === 0 ? (
            <p className="text-xs text-slate-500">現在お知らせはありません</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-white/10 pb-2 last:border-0">
                  <p className="flex items-start gap-1 text-sm font-medium">
                    {a.pinned && <span className="shrink-0 text-amber-400">📌</span>}
                    <span>{a.title}</span>
                  </p>
                  {a.body && <p className="mt-1 text-xs text-slate-400">{a.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {lostItemOpen && (
        <Modal onClose={() => setLostItemOpen(false)}>
          <h2 className="mb-3 text-base font-semibold">落とし物登録</h2>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">画像</span>
            <div className="flex items-center gap-2">
              {lostItemPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lostItemPhotoPreview}
                  alt="落とし物の画像"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-800 text-[10px] text-slate-500">
                  未設定
                </div>
              )}
              <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs">
                画像を選択
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLostItemPhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">内容</span>
            <textarea
              value={lostItemDescription}
              onChange={(e) => setLostItemDescription(e.target.value)}
              rows={2}
              placeholder="拾得物の内容を入力してください"
              className="w-full rounded-lg border border-white/10 bg-slate-800 p-2 text-sm"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-slate-400">拾った場所</span>
            <input
              type="text"
              value={lostItemFoundLocation}
              onChange={(e) => setLostItemFoundLocation(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 p-2 text-sm"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs text-slate-400">保管場所</span>
            <input
              type="text"
              value={lostItemStorageLocation}
              onChange={(e) => setLostItemStorageLocation(e.target.value)}
              placeholder="例）本部"
              className="w-full rounded-lg border border-white/10 bg-slate-800 p-2 text-sm"
            />
          </label>

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
              className="flex-1 rounded-lg bg-white/10 p-2 text-sm active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
