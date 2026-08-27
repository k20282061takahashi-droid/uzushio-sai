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
  subscribeBoothByToken,
  subscribeStaffAnnouncements,
  registerLostItem,
  sendEmergencyAlert,
  subscribeFestivalPhase,
  updateBooth,
  uploadSignboardImage,
} from "@/lib/booth";

const GENRE_OPTIONS = Object.keys(GENRE_LABELS) as BoothGenre[];

// 自分で連打した直後だけ、届いた値で画面の数字を戻さないための猶予（2秒）。
// 企画データ自体はFirestoreを購読していて、変更があった瞬間に届く。
const LOCAL_EDIT_GRACE_MS = 2_000;

// 状態ごとの色。作業しながらでも、ちらっと見ただけで分かるようにする。
function statusBadgeClass(booth: Booth): string {
  if (booth.status === "open") return "bg-bbb-green text-black";
  if (booth.status === "break") return "bg-bbb-yellow text-black";
  return "bg-bbb-red text-white";
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

// 送信時刻を「9/19 14:05」の形にする
function formatSentAt(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 運営からの連絡。ピン留めを一番上に、そのあとは新しい順。
// 件数が増えても全部たどれるよう、この枠の中だけをスクロールさせる。
// ＋ と − は、フォントの文字だと細くて小さいので、太い角丸の棒で描く。
// bg-current にしてあるので、ボタンの文字色（有効/無効）にそのまま追従する。
function PlusMark() {
  return (
    <span
      aria-hidden
      className="relative block h-11 w-11 sm:h-14 sm:w-14"
    >
      <span className="absolute left-0 top-1/2 h-[14%] min-h-[6px] w-full -translate-y-1/2 rounded-full bg-current" />
      <span className="absolute left-1/2 top-0 h-full w-[14%] min-w-[6px] -translate-x-1/2 rounded-full bg-current" />
    </span>
  );
}

function MinusMark() {
  return (
    <span
      aria-hidden
      className="relative block h-11 w-11 sm:h-14 sm:w-14"
    >
      <span className="absolute left-0 top-1/2 h-[14%] min-h-[6px] w-full -translate-y-1/2 rounded-full bg-current" />
    </span>
  );
}

function AnnouncementBoard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  if (announcements.length === 0) {
    return (
      <p className="font-read text-sm text-white/55">
        まだ連絡は届いていません
      </p>
    );
  }

  const byNewest = (a: Announcement, b: Announcement) =>
    (b.createdAt ?? 0) - (a.createdAt ?? 0);
  const ordered = [
    ...announcements.filter((a) => a.pinned).sort(byNewest),
    ...announcements.filter((a) => !a.pinned).sort(byNewest),
  ];

  return (
    <ul className="space-y-2">
      {ordered.map((a) => (
        <li
          key={a.id}
          className={`rounded-xl border-2 p-3 ${
            a.pinned
              ? "border-bbb-yellow/70 bg-bbb-yellow/10"
              : "border-white/12 bg-black/25"
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5">
            {a.pinned && (
              <PinIcon className="h-4 w-4 shrink-0 text-bbb-yellow" />
            )}
            <span className="text-[12px] tabular-nums text-white/45">
              {formatSentAt(a.createdAt)}
            </span>
          </div>
          <p className="font-pop text-[15px] leading-snug">{a.title}</p>
          {a.body && (
            <p className="font-read mt-1 whitespace-pre-wrap text-[14px] text-white/75">
              {a.body}
            </p>
          )}
        </li>
      ))}
    </ul>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border-2 border-white/20 bg-bbb-panel p-5 shadow-2xl sm:max-w-md lg:max-w-lg"
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

    // 企画データはFirestoreを購読する。運営が場所や企画名を変えたり、
    // 別の端末で状態を切り替えたりすると、その瞬間にこの画面へ届く。
    const unsubscribeBooth = subscribeBoothByToken(token, (b) => {
      setBooth((prev) => {
        // 自分が今まさに連打している最中だけは、届いた値で数字を戻さない
        const recentlyEdited =
          Date.now() - lastLocalEditAt.current < LOCAL_EDIT_GRACE_MS;
        if (!b) return null;
        if (prev && recentlyEdited) {
          return { ...b, waitingGroups: prev.waitingGroups, status: prev.status };
        }
        return b;
      });
      if (!b) return;
      const recentlyEdited =
        Date.now() - lastLocalEditAt.current < LOCAL_EDIT_GRACE_MS;
      if (!recentlyEdited) setWaitingGroups(b.waitingGroups ?? 0);
      setLastFetchedAt(
        new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
      // 連絡の購読は、企画が分かってから1回だけ始める
      if (!unsubscribeAnnouncements.current) {
        unsubscribeAnnouncements.current = subscribeStaffAnnouncements(
          setAnnouncements,
          b.id,
        );
      }
    });

    const unsubscribePhase = subscribeFestivalPhase(setFestivalPhase);

    return () => {
      unsubscribeBooth();
      unsubscribePhase();
      unsubscribeAnnouncements.current?.();
      unsubscribeAnnouncements.current = null;
    };
  }, [token]);

  // 設定フォームの初期値は、企画が最初に届いたときだけ入れる
  // （入力中に購読データで上書きしてしまわないようにする）
  const setupFilled = useRef(false);
  useEffect(() => {
    if (!booth || setupFilled.current) return;
    setupFilled.current = true;
    setProjectName(booth.projectName ?? "");
    setDescription(booth.description);
    setGenre(booth.genre ?? "");
    setTimePerGroup(booth.timePerGroup ?? "");
    setWaitingGroups(booth.waitingGroups ?? 0);
  }, [booth]);

  // 手で押す更新ボタン。購読で自動的に届くので普段は不要だが、
  // 「本当に最新か」を確かめたいときのために残してある。
  const [reloading, setReloading] = useState(false);
  async function reloadNow() {
    setReloading(true);
    const fresh = await getBoothByToken(token);
    if (fresh) {
      setBooth(fresh);
      setWaitingGroups(fresh.waitingGroups ?? 0);
      setLastFetchedAt(
        new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
    }
    setReloading(false);
  }

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
      <div className="mx-auto w-full max-w-md px-4 pt-8 text-white sm:max-w-2xl sm:px-6">
        <p className="text-sm text-white/55">読み込み中...</p>
      </div>
    );
  }

  if (booth === null) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-8 text-white sm:max-w-2xl sm:px-6">
        <p className="font-read text-sm text-bbb-red">
          このURLは無効です。企画担当のQRコード／URLを再度ご確認ください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-4 text-white sm:max-w-2xl sm:px-6 lg:max-w-6xl lg:px-8">
      {/* 上のバー：だれの画面かと、最終更新・更新ボタン */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-white/15 pb-3">
        <div className="flex items-baseline gap-3">
          <div className="leading-none">
            <p className="font-pop text-lg">渦潮祭</p>
            <p className="font-logo text-[11px] text-bbb-yellow">MANAGE</p>
          </div>
          <p className="font-pop border-b-[3px] border-bbb-yellow pb-0.5 text-xl sm:text-2xl">
            {booth.name}
          </p>
          {booth.projectName && (
            <p className="font-read text-sm text-white/55">
              {booth.projectName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right leading-tight">
            <p className="text-[11px] text-white/45">最終更新</p>
            <p className="font-num text-base tabular-nums">
              {lastFetchedAt || "--:--"}
            </p>
          </div>
          <button
            onClick={reloadNow}
            disabled={reloading}
            className="chunk min-h-[2.75rem] rounded-xl border-2 border-white/25 bg-white/5 px-4 text-sm font-bold text-white shadow-[0_4px_0_rgba(255,255,255,0.14)] disabled:opacity-50"
          >
            {reloading ? "更新中" : "更新"}
          </button>
        </div>
      </header>

      {view === "before" ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-4">
          <div className="lg:col-start-1">
            <section className="mb-4 rounded-2xl border-2 border-white/15 border-l-[6px] border-l-bbb-yellow bg-bbb-panel p-4 sm:grid sm:grid-cols-2 sm:gap-x-6">
                <h2 className="font-pop mb-3 text-lg text-bbb-yellow sm:col-span-2">
                  企画情報の設定
                </h2>
  
                <label className="mb-3 block">
                  <span className="font-read mb-1.5 block text-sm text-white/70">
                    企画名
                  </span>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="例）壊れるローラーコースター"
                    className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
                  />
                </label>
  
                {booth.hasWaiting && (
                  <label className="mb-3 block">
                    <span className="font-read mb-1.5 block text-sm text-white/70">
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
                      className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
                    />
                  </label>
                )}
  
                <div className="mb-3">
                  <span className="font-read mb-1.5 block text-sm text-white/70">
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
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-white/20 bg-black/40 text-[11px] text-white/45">
                        未設定
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="chunk font-pop cursor-pointer rounded-xl bg-bbb-yellow px-4 py-3 text-center text-sm text-black shadow-[0_5px_0_#A98F00]">
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
                      <label className="chunk cursor-pointer rounded-xl border-2 border-white/25 px-4 py-3 text-center text-sm font-bold text-white shadow-[0_5px_0_rgba(255,255,255,0.12)]">
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
                  <span className="font-read mb-1.5 block text-sm text-white/70">
                    カテゴリー
                  </span>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value as BoothGenre)}
                    className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
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
                  <span className="font-read mb-1.5 block text-sm text-white/70">詳細</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="来場者向けの企画説明を入力してください"
                    className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
                  />
                </label>
  
                <button
                  onClick={saveSetup}
                  disabled={savingSetup}
                  className="chunk font-pop w-full rounded-2xl bg-bbb-yellow p-4 text-lg text-black shadow-[0_6px_0_#A98F00] disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none sm:col-span-2"
                >
                  {savingSetup ? "保存中..." : "保存する"}
                </button>
              </section>
          </div>
          <section className="mb-4 rounded-2xl border-2 border-white/15 bg-bbb-panel/88 p-4 lg:col-start-2 lg:mb-0">
            <h2 className="font-logo mb-2 text-[13px] text-bbb-cyan">
              運営からのれんらく
            </h2>
            <AnnouncementBoard announcements={announcements} />
          </section>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-stretch lg:gap-4">
          {/* 左：運営からのれんらく（枠の中だけスクロール）と、緊急連絡 */}
          <div className="order-2 flex flex-col gap-3 lg:order-none lg:h-full">
            <section className="flex max-h-[55vh] min-h-[14rem] flex-1 flex-col rounded-2xl border-2 border-white/15 bg-bbb-panel/88 p-3 lg:max-h-none lg:min-h-0">
              <h2 className="font-logo mb-2 shrink-0 text-[13px] text-bbb-cyan">
                運営からのれんらく
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <AnnouncementBoard announcements={announcements} />
              </div>
            </section>

            {/* 緊急連絡は他のボタンから離して置く（間違って押さないため） */}
            <button
              onClick={() => {
                setEmergencyOpen(true);
                setEmergencySent(false);
              }}
              className="chunk font-pop min-h-[4.5rem] w-full shrink-0 rounded-2xl bg-bbb-red text-xl text-white shadow-[0_7px_0_#7C0A11]"
            >
              緊急連絡
            </button>
            {emergencySent && (
              <p className="font-read shrink-0 text-sm text-bbb-green">
                運営へ通知を送信しました
              </p>
            )}
          </div>

          {/* 右：ふだんの操作 */}
          <div className="order-1 flex flex-col gap-3 lg:order-none lg:h-full">
            {/* 来場者からの見え方 */}
            <div className="rounded-2xl border-2 border-white/15 bg-bbb-panel/88 px-4 py-3 text-center">
              <p className="font-read text-[13px] text-white/60">
                いま来場者に表示されている状態
              </p>
              <span
                className={`font-pop mt-1.5 inline-block rounded-xl px-6 py-2 text-2xl sm:text-3xl ${statusBadgeClass(booth)}`}
              >
                {visitorStatusLabel(booth)}
              </span>
            </div>

            {booth.hasWaiting && (
              <section className="rounded-2xl border-2 border-white/15 bg-bbb-panel/88 p-4">
                <p className="font-logo text-[13px] text-bbb-cyan">
                  WAITING GROUPS
                </p>
                <p className="font-read -mt-0.5 mb-2 text-[13px] text-white/55">
                  待っているグループ数
                </p>
                <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-10">
                  <button
                    onClick={() => adjustWaiting(-1)}
                    disabled={savingWait || booth.status !== "open"}
                    aria-label="待っているグループを1つ減らす"
                    className="chunk flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] bg-bbb-yellow text-black shadow-[0_7px_0_#A98F00] disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none sm:h-28 sm:w-28 lg:h-32 lg:w-32"
                  >
                    <MinusMark />
                  </button>
                  <p
                    key={waitingGroups}
                    className="animate-bump font-num min-w-[2.5ch] text-center text-8xl leading-none tabular-nums text-bbb-yellow sm:text-9xl"
                  >
                    {waitingGroups}
                  </p>
                  <button
                    onClick={() => adjustWaiting(1)}
                    disabled={savingWait || booth.status !== "open"}
                    aria-label="待っているグループを1つ増やす"
                    className="chunk flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] bg-bbb-yellow text-black shadow-[0_7px_0_#A98F00] disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none sm:h-28 sm:w-28 lg:h-32 lg:w-32"
                  >
                    <PlusMark />
                  </button>
                </div>
                {booth.status !== "open" ? (
                  <p className="font-read mt-3 text-center text-sm text-white/60">
                    {booth.status === "break"
                      ? "休憩中は変更できません"
                      : "終了しているため変更できません"}
                  </p>
                ) : (
                  booth.timePerGroup != null && (
                    <p className="font-read mt-3 text-center text-sm text-white/60">
                      待ち時間の目安 {waitingGroups * booth.timePerGroup}分
                    </p>
                  )
                )}
              </section>
            )}

            {/* 一時休憩（再開）と終了 */}
            <div className="grid grid-cols-2 gap-3">
              {booth.status === "break" || booth.status === "closed" ? (
                <button
                  onClick={() => changeStatus("open")}
                  disabled={changingStatus}
                  className="chunk font-pop min-h-[4.5rem] rounded-2xl bg-bbb-green text-lg text-black shadow-[0_6px_0_#00931D]"
                >
                  再開する
                </button>
              ) : (
                <button
                  onClick={() => changeStatus("break")}
                  disabled={changingStatus || booth.status !== "open"}
                  className="chunk font-pop min-h-[4.5rem] rounded-2xl bg-bbb-cyan text-lg text-black shadow-[0_6px_0_#017C8A] disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none"
                >
                  一時休憩
                </button>
              )}
              <button
                onClick={() => setConfirmClose(true)}
                disabled={changingStatus || booth.status === "closed"}
                className="chunk font-pop min-h-[4.5rem] rounded-2xl border-[3px] border-[#FF5147] bg-[#FF5147]/10 text-lg text-[#FF7A72] shadow-[0_6px_0_#6E0D12] disabled:border-white/15 disabled:bg-transparent disabled:text-white/25 disabled:shadow-none"
              >
                終了
              </button>
            </div>

            <button
              onClick={openLostItemModal}
              className="chunk font-pop min-h-[4.5rem] w-full rounded-2xl bg-bbb-blue text-lg text-white shadow-[0_6px_0_#004A7C] lg:mt-auto"
            >
              おとしもの登録
            </button>
            {lostItemSaved && (
              <p className="font-read text-sm text-bbb-green">
                落とし物を登録しました
              </p>
            )}
          </div>
        </div>
      )}

      {confirmClose && (
        <Modal onClose={() => setConfirmClose(false)}>
          <p className="font-pop mb-5 text-center text-xl">
            本当に終了しますか
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => changeStatus("closed")}
              disabled={changingStatus}
              className="chunk font-pop flex-1 rounded-xl bg-bbb-red p-4 text-base text-white shadow-[0_5px_0_#7C0A11]"
            >
              終了
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="chunk flex-1 rounded-xl border-2 border-white/25 p-4 text-base font-bold text-white shadow-[0_5px_0_rgba(255,255,255,0.12)]"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {lostItemOpen && (
        <Modal onClose={() => setLostItemOpen(false)}>
          <h2 className="font-pop mb-3 text-xl text-white">落とし物登録</h2>

          <label className="mb-3 block">
            <span className="font-read mb-1.5 block text-sm text-white/70">画像</span>
            <div className="flex items-center gap-2">
              {lostItemPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lostItemPhotoPreview}
                  alt="落とし物の画像"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-white/20 bg-black/40 text-[11px] text-white/45">
                  未設定
                </div>
              )}
              <div className="flex flex-col gap-2">
                {/* capture を付けると、スマホでは撮影画面が直接ひらく */}
                <label className="chunk font-pop cursor-pointer rounded-xl bg-bbb-yellow px-4 py-3 text-center text-sm text-black shadow-[0_5px_0_#A98F00]">
                  写真を撮る
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleLostItemPhotoChange}
                    className="hidden"
                  />
                </label>
                <label className="chunk cursor-pointer rounded-xl border-2 border-white/25 px-4 py-3 text-center text-sm font-bold text-white shadow-[0_5px_0_rgba(255,255,255,0.12)]">
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
            <span className="font-read mb-1.5 block text-sm text-white/70">内容</span>
            <textarea
              value={lostItemDescription}
              onChange={(e) => setLostItemDescription(e.target.value)}
              rows={2}
              placeholder="拾得物の内容を入力してください"
              className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
            />
          </label>

          <label className="mb-3 block">
            <span className="font-read mb-1.5 block text-sm text-white/70">
              拾った場所
            </span>
            <input
              type="text"
              value={lostItemFoundLocation}
              onChange={(e) => setLostItemFoundLocation(e.target.value)}
              className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
            />
          </label>

          <label className="mb-4 block">
            <span className="font-read mb-1.5 block text-sm text-white/70">保管場所</span>
            <input
              type="text"
              value={lostItemStorageLocation}
              onChange={(e) => setLostItemStorageLocation(e.target.value)}
              placeholder="例）本部"
              className="w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={submitLostItem}
              disabled={lostItemSaving}
              className="chunk font-pop flex-1 rounded-xl bg-bbb-yellow p-4 text-base text-black shadow-[0_5px_0_#A98F00] disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none"
            >
              {lostItemSaving ? "登録中..." : "登録する"}
            </button>
            <button
              onClick={() => setLostItemOpen(false)}
              className="chunk flex-1 rounded-xl border-2 border-white/25 p-4 text-base font-bold text-white shadow-[0_5px_0_rgba(255,255,255,0.12)]"
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
          <h2 className="mb-3 text-base font-semibold text-bbb-red">
            緊急連絡
          </h2>
          <textarea
            value={emergencyMessage}
            onChange={(e) => setEmergencyMessage(e.target.value)}
            rows={3}
            placeholder="状況を簡潔に入力してください（空欄でも送信できます）"
            className="mb-3 w-full rounded-xl border-2 border-white/20 bg-black/40 p-3 text-base text-white placeholder:text-white/35"
          />
          <div className="flex gap-2">
            <button
              onClick={submitEmergency}
              disabled={emergencySending}
              className="chunk font-pop flex-1 rounded-xl bg-bbb-red p-4 text-base text-white shadow-[0_5px_0_#7C0A11] disabled:opacity-50"
            >
              {emergencySending ? "送信中..." : "運営へ送信する"}
            </button>
            <button
              onClick={() => setEmergencyOpen(false)}
              className="chunk flex-1 rounded-xl border-2 border-white/25 p-4 text-base font-bold text-white shadow-[0_5px_0_rgba(255,255,255,0.12)]"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
