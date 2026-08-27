"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import StaffAlertOverlay from "@/components/StaffAlertOverlay";
import { PinIcon } from "@/components/Icon";
import {
  Announcement,
  Booth,
  BoothGenre,
  BoothStatus,
  FestivalPhase,
  GENRE_LABELS,
  getBoothByToken,
  subscribeStaffAnnouncements,
  registerLostItem,
  sendEmergencyAlert,
  subscribeFestivalPhase,
  updateBooth,
  uploadSignboardImage,
} from "@/lib/booth";

const GENRE_OPTIONS = Object.keys(GENRE_LABELS) as BoothGenre[];

// 企画データを取り直す間隔（30秒）。
// 運営が場所や企画名を変えても、担当者側の画面が古いままにならないようにする。
const REFRESH_INTERVAL_MS = 30_000;
// 自分で操作した直後は、取り直した古い値で上書きしないための猶予時間。
const LOCAL_EDIT_GRACE_MS = 30_000;

// 状態ごとの色。作業しながらでも、ちらっと見ただけで分かるようにする。
function statusBadgeClass(booth: Booth): string {
  if (booth.status === "open") return "bg-success-600 text-white";
  if (booth.status === "break") return "bg-warn-600 text-neutral-900";
  return "bg-danger-600 text-white";
}

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
    return <p className="text-xs text-neutral-500">現在お知らせはありません</p>;
  }

  // 並べ替え：ピン留めを先に、そのあと新しい順
  const ordered = [
    ...announcements.filter((a) => a.pinned),
    ...announcements.filter((a) => !a.pinned),
  ];

  return (
    <>
      {/* スマホ・タブレット：場所が狭いので、順番に流して見せる */}
      <button onClick={onOpenList} className="w-full text-left lg:hidden">
        {pinned.length > 0 && (
          <ul className="mb-2 space-y-1">
            {pinned.map((a) => (
              <li key={a.id} className="flex items-center gap-1 text-sm">
                <PinIcon className="h-4 w-4 shrink-0 text-warn-800" />
                <span className="truncate">{a.title}</span>
              </li>
            ))}
          </ul>
        )}
        {latest.length > 0 && (
          <div className="relative h-6 overflow-hidden text-sm text-neutral-600">
            {latest.map((a, i) => (
              <span
                key={a.id}
                className="absolute inset-0 flex items-center transition-transform duration-500 ease-in-out"
                style={{ transform: `translateY(${(i - tickerIndex) * 100}%)` }}
              >
                <span className="truncate">{a.title}</span>
              </span>
            ))}
          </div>
        )}
      </button>

      {/* パソコンなど広い画面：縦に並べて全部そのまま読めるようにする */}
      <ul className="hidden max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto lg:block">
        {ordered.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-mist-200 bg-white p-3"
          >
            <p className="flex items-start gap-1.5 text-[15px] font-semibold">
              {a.pinned && (
                <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-warn-800" />
              )}
              <span>{a.title}</span>
            </p>
            {a.body && (
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-neutral-600">
                {a.body}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
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
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl border border-mist-200 bg-white p-5 shadow-xl sm:max-w-md lg:max-w-lg"
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
  const [lostItemPhotoPreview, setLostItemPhotoPreview] = useState<
    string | null
  >(null);
  const [lostItemSaving, setLostItemSaving] = useState(false);
  const [lostItemSaved, setLostItemSaved] = useState(false);

  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencySending, setEmergencySending] = useState(false);
  const [emergencySent, setEmergencySent] = useState(false);

  // 連絡の購読を解除するための関数。企画が分かってから購読を始める。
  const unsubscribeAnnouncements = useRef<(() => void) | null>(null);
  // 自分が最後に待ち組数やステータスを操作した時刻
  const lastLocalEditAt = useRef(0);
  // 最後にデータを取り直した時刻（画面に表示する）
  const [lastFetchedAt, setLastFetchedAt] = useState<string>("");

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
        // 自分あて（と全企画あて）の連絡を購読する。
        // 購読にすることで、運営が編集・削除した内容がその場で反映される。
        unsubscribeAnnouncements.current = subscribeStaffAnnouncements(
          setAnnouncements,
          b.id,
        );
      }
    });
    const unsubscribePhase = subscribeFestivalPhase(setFestivalPhase);

    // 30秒ごとに企画データを取り直す。
    // ただし自分が直前に操作した待ち組数・ステータスは上書きしない
    // （送信中の値を古い値で戻してしまわないため）。
    const timer = setInterval(async () => {
      const fresh = await getBoothByToken(token);
      if (!fresh) return;
      const recentlyEdited =
        Date.now() - lastLocalEditAt.current < LOCAL_EDIT_GRACE_MS;
      setBooth((prev) =>
        prev && recentlyEdited
          ? {
              ...fresh,
              waitingGroups: prev.waitingGroups,
              status: prev.status,
            }
          : fresh,
      );
      if (!recentlyEdited) setWaitingGroups(fresh.waitingGroups ?? 0);
      setLastFetchedAt(
        new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      unsubscribePhase();
      unsubscribeAnnouncements.current?.();
      unsubscribeAnnouncements.current = null;
    };
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
    lastLocalEditAt.current = Date.now();
    const next = Math.max(0, waitingGroups + delta);
    setWaitingGroups(next);
    setSavingWait(true);
    await updateBooth(booth.id, { waitingGroups: next });
    setBooth({ ...booth, waitingGroups: next });
    setSavingWait(false);
  }

  async function changeStatus(status: BoothStatus) {
    if (!booth) return;
    lastLocalEditAt.current = Date.now();
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
      <div className="mx-auto w-full max-w-md px-4 pt-8 text-neutral-900 sm:max-w-2xl sm:px-6">
        <p className="text-sm text-neutral-500">読み込み中...</p>
      </div>
    );
  }

  if (booth === null) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-8 text-neutral-900 sm:max-w-2xl sm:px-6">
        <p className="text-sm text-danger-800">
          このURLは無効です。企画担当のQRコード／URLを再度ご確認ください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-8 text-neutral-900 sm:max-w-2xl sm:px-6 lg:max-w-5xl lg:px-8">
      <div className="mb-4 rounded-xl bg-kosei-800 px-5 py-4 text-white">
        <p className="text-[12px] font-medium tracking-[0.18em] text-kosei-200">
          UZUSHIO-SAI ・ 企画担当者用
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {booth.name}
        </p>
        {booth.projectName && (
          <p className="mt-0.5 text-base text-kosei-100">{booth.projectName}</p>
        )}
        {view !== "before" && (
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-3">
            <p className="text-[12px] tracking-[0.06em] text-kosei-200">
              いま来場者に見えている表示
            </p>
            <span
              className={`rounded-lg px-4 py-1.5 text-xl font-bold sm:text-2xl ${statusBadgeClass(booth)}`}
            >
              {visitorStatusLabel(booth)}
            </span>
          </div>
        )}
        {lastFetchedAt && (
          <p className="mt-2 text-[12px] text-kosei-300">
            最終更新 {lastFetchedAt}（30秒ごとに自動で更新されます）
          </p>
        )}
      </div>

      {/* パソコン・iPadでは左に操作パネル、右に運営からの連絡を並べる。
          スマホでは今までどおり縦に並ぶ。 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <section className="order-2 mb-4 rounded-xl border border-mist-200 bg-white p-4 shadow-[0_1px_3px_rgba(18,73,90,0.07)] lg:order-none lg:col-start-2 lg:row-start-1 lg:mb-0">
          <h2 className="mb-2 text-sm font-bold tracking-[0.04em] text-kosei-800">
            運営からの連絡
          </h2>
          <AnnouncementBoard
            announcements={announcements}
            onOpenList={() => setAnnouncementListOpen(true)}
          />
        </section>

        <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          {view === "before" ? (
            <section className="mb-4 rounded-xl border border-mist-200 border-l-[3px] border-l-warn-600 bg-white p-4 shadow-[0_1px_3px_rgba(18,73,90,0.07)] sm:grid sm:grid-cols-2 sm:gap-x-6">
              <h2 className="mb-3 text-sm font-bold tracking-[0.04em] text-warn-800 sm:col-span-2">
                企画情報の設定
              </h2>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">
                  企画名
                </span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="例）壊れるローラーコースター"
                  className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
                />
              </label>

              {booth.hasWaiting && (
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">
                    1グループあたりの対応時間（分）
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={timePerGroup}
                    onChange={(e) =>
                      setTimePerGroup(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
                  />
                </label>
              )}

              <div className="mb-3">
                <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">
                  看板画像
                </span>
                <div className="mb-1 flex items-center gap-2">
                  {booth.signboardUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={booth.signboardUrl}
                      alt="看板画像"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-mist-200 bg-mist-50 text-[11px] text-neutral-500">
                      未設定
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="lift cursor-pointer rounded-lg bg-kosei-800 px-4 py-3 text-center text-sm font-bold text-white">
                      {uploadingSignboard ? "アップロード中..." : "写真を撮る"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleSignboardChange}
                        className="hidden"
                        disabled={uploadingSignboard}
                      />
                    </label>
                    <label className="lift cursor-pointer rounded-lg border border-kosei-800/25 bg-white px-4 py-3 text-center text-sm font-bold text-kosei-800">
                      画像を選ぶ
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
              </div>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">
                  カテゴリー
                </span>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as BoothGenre)}
                  className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
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
                <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">詳細</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="来場者向けの企画説明を入力してください"
                  className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
                />
              </label>

              <button
                onClick={saveSetup}
                disabled={savingSetup}
                className="lift w-full rounded-lg bg-kosei-800 p-4 text-base font-bold text-white disabled:bg-mist-200 disabled:text-mist-300 disabled:shadow-none sm:col-span-2"
              >
                {savingSetup ? "保存中..." : "保存する"}
              </button>
            </section>
          ) : (
            <>
              <section className="mb-4 rounded-xl border border-mist-200 bg-white p-4 shadow-[0_1px_3px_rgba(18,73,90,0.07)] sm:p-6">

              {booth.hasWaiting && (
                <div className="mb-5 flex items-center justify-between gap-3 lg:justify-center lg:gap-14">
                  {/* iPadを作業しながら片手で触る前提。指で確実に押せるよう、
                      ボタンは大きく、左右の端に置いている。 */}
                  <button
                    onClick={() => adjustWaiting(-1)}
                    disabled={savingWait || booth.status !== "open"}
                    aria-label="待っているグループを1つ減らす"
                    className="lift h-28 w-28 shrink-0 rounded-2xl bg-kosei-800 text-5xl font-bold text-white disabled:border disabled:border-mist-200 disabled:bg-white disabled:text-mist-300 disabled:shadow-none sm:h-36 sm:w-36 lg:h-40 lg:w-40 lg:text-6xl"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center lg:w-56 lg:flex-none">
                    <p className="text-[13px] font-medium tracking-[0.04em] text-neutral-500">
                      待っているグループ
                    </p>
                    {/* key を付けると数字が変わるたびに作り直され、跳ねる動きが毎回出る */}
                    <p
                      key={waitingGroups}
                      className="animate-bump text-8xl font-bold leading-none tabular-nums text-kosei-800 sm:text-9xl"
                    >
                      {waitingGroups}
                    </p>
                    {booth.status !== "open" ? (
                      <p className="mt-2 text-[13px] text-neutral-500">
                        {booth.status === "break"
                          ? "休憩中は変更できません"
                          : "終了しているため変更できません"}
                      </p>
                    ) : (
                      booth.timePerGroup != null && (
                        <p className="mt-2 text-[13px] text-neutral-500">
                          待ち時間の目安 {waitingGroups * booth.timePerGroup}分
                        </p>
                      )
                    )}
                  </div>
                  <button
                    onClick={() => adjustWaiting(1)}
                    disabled={savingWait || booth.status !== "open"}
                    aria-label="待っているグループを1つ増やす"
                    className="lift h-28 w-28 shrink-0 rounded-2xl bg-kosei-800 text-5xl font-bold text-white disabled:border disabled:border-mist-200 disabled:bg-white disabled:text-mist-300 disabled:shadow-none sm:h-36 sm:w-36 lg:h-40 lg:w-40 lg:text-6xl"
                  >
                    ＋
                  </button>
                </div>
              )}

              {/* 状態を変えるボタン。指で押す前提なので高さを72px以上にしている */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <button
                  onClick={() => setConfirmClose(true)}
                  disabled={changingStatus || booth.status === "closed"}
                  className="lift min-h-[4.5rem] rounded-xl border-2 border-danger-800/30 bg-white text-lg font-bold text-danger-800 disabled:border-mist-200 disabled:bg-mist-50 disabled:text-mist-300 disabled:shadow-none"
                >
                  終了
                </button>
                {booth.status === "break" || booth.status === "closed" ? (
                  <button
                    onClick={() => changeStatus("open")}
                    disabled={changingStatus}
                    className="lift min-h-[4.5rem] rounded-xl border-2 border-success-800/40 bg-white text-lg font-bold text-success-800"
                  >
                    再開する
                  </button>
                ) : (
                  <button
                    onClick={() => changeStatus("break")}
                    disabled={changingStatus || booth.status !== "open"}
                    className="lift min-h-[4.5rem] rounded-xl border-2 border-kosei-800/25 bg-white text-lg font-bold text-kosei-800 disabled:border-mist-200 disabled:bg-mist-50 disabled:text-mist-300 disabled:shadow-none"
                  >
                    一時休憩
                  </button>
                )}
                <button
                  onClick={openLostItemModal}
                  className="lift min-h-[4.5rem] rounded-xl border-2 border-warn-800/35 bg-white text-lg font-bold text-warn-800"
                >
                  落とし物登録
                </button>
              </div>
              {lostItemSaved && (
                <p className="mt-3 text-sm text-success-800">
                  落とし物を登録しました
                </p>
              )}
            </section>

            {/* 緊急連絡は誤って押さないよう、他のボタンから離してカードの外に置く */}
            <button
              onClick={() => {
                setEmergencyOpen(true);
                setEmergencySent(false);
              }}
              className="lift mb-4 min-h-[4.5rem] w-full rounded-xl bg-danger-800 text-lg font-bold text-white"
            >
              緊急連絡
            </button>
              {emergencySent && (
                <p className="mb-4 text-sm text-success-800">
                  運営へ通知を送信しました
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {confirmClose && (
        <Modal onClose={() => setConfirmClose(false)}>
          <p className="mb-4 text-center text-base font-semibold">
            本当に終了しますか
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => changeStatus("closed")}
              disabled={changingStatus}
              className="flex-1 rounded-lg bg-danger-800 p-3 text-sm font-semibold text-white active:scale-95"
            >
              終了
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="flex-1 rounded-lg border border-mist-200 bg-white text-kosei-800 p-3 text-sm active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {announcementListOpen && (
        <Modal onClose={() => setAnnouncementListOpen(false)}>
          <h2 className="mb-3 text-lg font-bold text-kosei-800">運営からの連絡一覧</h2>
          {announcements.length === 0 ? (
            <p className="text-xs text-neutral-500">現在お知らせはありません</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="border-b border-mist-200 pb-2 last:border-0"
                >
                  <p className="flex items-start gap-1 text-sm font-medium">
                    {a.pinned && (
                      <PinIcon className="h-4 w-4 shrink-0 text-warn-800" />
                    )}
                    <span>{a.title}</span>
                  </p>
                  {a.body && (
                    <p className="mt-1 text-xs text-neutral-500">{a.body}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {lostItemOpen && (
        <Modal onClose={() => setLostItemOpen(false)}>
          <h2 className="mb-3 text-lg font-bold text-kosei-800">落とし物登録</h2>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">画像</span>
            <div className="flex items-center gap-2">
              {lostItemPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lostItemPhotoPreview}
                  alt="落とし物の画像"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-mist-200 bg-mist-50 text-[11px] text-neutral-500">
                  未設定
                </div>
              )}
              <div className="flex flex-col gap-2">
                {/* capture を付けると、スマホでは撮影画面が直接ひらく */}
                <label className="lift cursor-pointer rounded-lg bg-kosei-800 px-4 py-3 text-center text-sm font-bold text-white">
                  写真を撮る
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleLostItemPhotoChange}
                    className="hidden"
                  />
                </label>
                <label className="lift cursor-pointer rounded-lg border border-kosei-800/25 bg-white px-4 py-3 text-center text-sm font-bold text-kosei-800">
                  画像を選ぶ
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLostItemPhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">内容</span>
            <textarea
              value={lostItemDescription}
              onChange={(e) => setLostItemDescription(e.target.value)}
              rows={2}
              placeholder="拾得物の内容を入力してください"
              className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">
              拾った場所
            </span>
            <input
              type="text"
              value={lostItemFoundLocation}
              onChange={(e) => setLostItemFoundLocation(e.target.value)}
              className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">保管場所</span>
            <input
              type="text"
              value={lostItemStorageLocation}
              onChange={(e) => setLostItemStorageLocation(e.target.value)}
              placeholder="例）本部"
              className="w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={submitLostItem}
              disabled={lostItemSaving}
              className="lift flex-1 rounded-lg bg-kosei-800 p-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {lostItemSaving ? "登録中..." : "登録する"}
            </button>
            <button
              onClick={() => setLostItemOpen(false)}
              className="flex-1 rounded-lg border border-mist-200 bg-white text-kosei-800 p-2 text-sm active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {/* 運営からの緊急一斉連絡（届いたら全画面で割り込む） */}
      <StaffAlertOverlay boothId={booth.id} />

      {emergencyOpen && (
        <Modal onClose={() => setEmergencyOpen(false)}>
          <h2 className="mb-3 text-base font-semibold text-danger-800">
            緊急連絡
          </h2>
          <textarea
            value={emergencyMessage}
            onChange={(e) => setEmergencyMessage(e.target.value)}
            rows={3}
            placeholder="状況を簡潔に入力してください（空欄でも送信できます）"
            className="mb-3 w-full rounded-lg border border-mist-200 bg-white p-3 text-base"
          />
          <div className="flex gap-2">
            <button
              onClick={submitEmergency}
              disabled={emergencySending}
              className="flex-1 rounded-lg bg-danger-800 p-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
            >
              {emergencySending ? "送信中..." : "運営へ送信する"}
            </button>
            <button
              onClick={() => setEmergencyOpen(false)}
              className="flex-1 rounded-lg border border-mist-200 bg-white text-kosei-800 p-3 text-sm active:scale-95"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
