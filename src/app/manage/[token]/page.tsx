"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import StaffAlertOverlay, {
  StaffAlertBanner,
} from "@/components/StaffAlertOverlay";
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
  updateCrowdLevel,
} from "@/lib/booth";
import { crowdLevelOfBooth } from "@/lib/boothPlacement";
import { CROWD_LEVELS, crowdInfo, type CrowdLevel } from "@/lib/waitColor";
import { saveSignboard, loadSignboard } from "@/lib/signboard";

const GENRE_OPTIONS = Object.keys(GENRE_LABELS) as BoothGenre[];

// 自分で連打した直後だけ、届いた値で画面の数字を戻さないための猶予（2秒）。
// 企画データ自体はFirestoreを購読していて、変更があった瞬間に届く。
const LOCAL_EDIT_GRACE_MS = 2_000;

// 状態ごとの色。作業しながらでも、ちらっと見ただけで分かるようにする。
function statusBadgeClass(booth: Booth): string {
  if (booth.status === "open") return "bg-bbb-green text-white";
  if (booth.status === "break") return "bg-bbb-yellow text-white";
  return "bg-bbb-red text-white";
}

function visitorStatusLabel(booth: Booth): string {
  if (booth.status === "closed") return "終了";
  if (booth.status === "break") return "休憩中";
  const level = crowdLevelOfBooth(booth);
  if (level !== null) return crowdInfo(level).label;
  if (booth.hasWaiting) return "混雑は確認中";
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
// ＋−のマーク。2025年までの「待ちグループ数」の画面で使っていた。
// 今は5段階のボタンに変えたので出番がないが、戻すときのために残している。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <p className="font-read text-sm text-kosei-500">
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
              : "border-kosei-200 bg-kosei-50"
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5">
            {a.pinned && (
              <PinIcon className="h-4 w-4 shrink-0 text-bbb-yellow" />
            )}
            <span className="text-[12px] tabular-nums text-kosei-500">
              {formatSentAt(a.createdAt)}
            </span>
          </div>
          <p className="font-pop text-[15px] leading-snug">{a.title}</p>
          {a.body && (
            <p className="font-read mt-1 whitespace-pre-wrap text-[14px] text-kosei-700">
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
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border-2 border-kosei-300 bg-white p-5 shadow-2xl sm:max-w-md lg:max-w-lg"
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
  const [uploadingSignboard, setUploadingSignboard] = useState(false);
  const [signboardError, setSignboardError] = useState("");
  // 看板画像は別のコレクションにあるので、開いたときに読み込む
  const [signboard, setSignboard] = useState<string | null>(null);
  const [savingSetup, setSavingSetup] = useState(false);

  // いま選ばれている混みぐあい（1〜5）。まだ選んでいなければ null。
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel | null>(null);
  const [savingWait, setSavingWait] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const [lostItemOpen, setLostItemOpen] = useState(false);
  const [lostItemDescription, setLostItemDescription] = useState("");
  const [lostItemFoundLocation, setLostItemFoundLocation] = useState("");
  const [lostItemStorageLocation, setLostItemStorageLocation] = useState("");
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
          return { ...b, crowdLevel: prev.crowdLevel, status: prev.status };
        }
        return b;
      });
      if (!b) return;
      const recentlyEdited =
        Date.now() - lastLocalEditAt.current < LOCAL_EDIT_GRACE_MS;
      if (!recentlyEdited) setCrowdLevel(crowdLevelOfBooth(b));
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
    setCrowdLevel(crowdLevelOfBooth(booth));
  }, [booth]);

  // 手で押す更新ボタン。購読で自動的に届くので普段は不要だが、
  // 「本当に最新か」を確かめたいときのために残してある。
  const [reloading, setReloading] = useState(false);
  async function reloadNow() {
    setReloading(true);
    const fresh = await getBoothByToken(token);
    if (fresh) {
      setBooth(fresh);
      setCrowdLevel(crowdLevelOfBooth(fresh));
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
      isSetupDone,
    };
    await updateBooth(booth.id, fields);
    setBooth({ ...booth, ...fields });
    setSavingSetup(false);
  }

  // 看板画像の読み込み
  useEffect(() => {
    let alive = true;
    const load =
      booth?.hasSignboard && booth.id
        ? loadSignboard(booth.id)
        : Promise.resolve(null);
    load
      .then((url) => {
        if (alive) setSignboard(url);
      })
      .catch(() => {
        if (alive) setSignboard(null);
      });
    return () => {
      alive = false;
    };
  }, [booth?.id, booth?.hasSignboard]);

  async function handleSignboardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !booth) return;
    setUploadingSignboard(true);
    setSignboardError("");
    try {
      // ブラウザの中で縮小・圧縮してからFirestoreに保存する
      const dataUrl = await saveSignboard(booth.id, file);
      await updateBooth(booth.id, { hasSignboard: true });
      setBooth({ ...booth, hasSignboard: true });
      setSignboard(dataUrl);
    } catch {
      setSignboardError("画像を保存できませんでした。もう一度お試しください");
    } finally {
      // 失敗しても「アップロード中」のまま固まらないように必ず戻す
      setUploadingSignboard(false);
    }
  }

  // 混みぐあいのボタンを押したとき。
  // 画面はすぐ切り替えて、保存はそのあと。接客の合間に押せるよう、待たせない。
  async function chooseCrowd(level: CrowdLevel) {
    if (!booth) return;
    // ボタンを押したときだけ動く処理。画面を描いている最中には呼ばれないので、
    // ここで今の時刻を見ても問題ない（チェック機能が判別できないため印をつけている）。
    // eslint-disable-next-line react-hooks/purity
    lastLocalEditAt.current = Date.now();
    setCrowdLevel(level);
    setSavingWait(true);
    await updateCrowdLevel(booth.id, level);
    setBooth({ ...booth, crowdLevel: level });
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
    setLostItemSaved(false);
    setLostItemOpen(true);
  }

  async function submitLostItem() {
    if (!booth) return;
    setLostItemSaving(true);
    await registerLostItem({
      boothId: booth.id,
      boothName: booth.name,
      description: lostItemDescription,
      foundLocation: lostItemFoundLocation,
      storageLocation: lostItemStorageLocation,
    });
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
      <div className="mx-auto w-full max-w-md px-4 pt-8 text-kosei-800 sm:max-w-2xl sm:px-6">
        <p className="text-sm text-kosei-500">読み込み中...</p>
      </div>
    );
  }

  if (booth === null) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-8 text-kosei-800 sm:max-w-2xl sm:px-6">
        <p className="font-read text-sm text-bbb-red">
          このURLは無効です。企画担当のQRコード／URLを再度ご確認ください。
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-md flex-col px-4 pb-6 pt-4 text-kosei-800 sm:max-w-2xl sm:px-6 lg:max-w-6xl lg:px-8 ${
        view === "before" ? "" : "lg:h-screen lg:overflow-hidden"
      }`}
    >
      {/* 本部からの一斉連絡。確認したあとも内容がここに残る */}
      <div className="shrink-0">
        <StaffAlertBanner boothId={booth.id} />
      </div>

      {/* 上のバー：だれの画面かと、最終更新・更新ボタン */}
      <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-kosei-300 pb-3">
        <div className="flex items-baseline gap-3">
          <div className="leading-none">
            <p className="font-pop text-lg">渦潮祭</p>
            <p className="font-logo text-[11px] text-bbb-yellow">MANAGE</p>
          </div>
          <p className="font-pop border-b-[3px] border-bbb-yellow pb-0.5 text-xl sm:text-2xl">
            {booth.name}
          </p>
          {booth.projectName && (
            <p className="font-read text-sm text-kosei-500">
              {booth.projectName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right leading-tight">
            <p className="text-[11px] text-kosei-500">最終更新</p>
            <p className="font-num text-base tabular-nums">
              {lastFetchedAt || "--:--"}
            </p>
          </div>
          <button
            onClick={reloadNow}
            disabled={reloading}
            className="chunk min-h-[2.75rem] rounded-xl border-2 border-kosei-300 bg-kosei-50 px-4 text-sm font-bold text-kosei-800 shadow-[0_4px_0_rgba(255,255,255,0.14)] disabled:opacity-50"
          >
            {reloading ? "更新中" : "更新"}
          </button>
        </div>
      </header>

      {view === "before" ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-4">
          <div className="lg:col-start-1">
            <section className="mb-4 rounded-2xl border-2 border-kosei-300 border-l-[6px] border-l-bbb-yellow bg-white p-4 sm:grid sm:grid-cols-2 sm:gap-x-6">
                <h2 className="font-pop mb-3 text-lg text-bbb-yellow sm:col-span-2">
                  企画情報の設定
                </h2>
  
                <label className="mb-3 block">
                  <span className="font-read mb-1.5 block text-sm text-kosei-600">
                    企画名
                  </span>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="例）壊れるローラーコースター"
                    className="w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
                  />
                </label>
  
                {/* 2025年までは「1グループあたりの対応時間（分）」を入れてもらい、
                    待ち組数と掛け算して待ち時間を出していた。
                    2026年からは当日の画面で5段階から選ぶだけにしたので、
                    ここでの入力は不要になった。 */}
                {booth.hasWaiting && (
                  <p className="font-read mb-3 rounded-xl border-2 border-kosei-300 bg-kosei-50 p-3 text-sm text-kosei-600">
                    この企画は、当日の画面で混みぐあい（5段階）を選ぶ形になっています。
                    ここでの設定は要りません。
                  </p>
                )}
  
                <div className="mb-3">
                  <span className="font-read mb-1.5 block text-sm text-kosei-600">
                    看板画像
                  </span>
                  <div className="mb-1 flex items-center gap-2">
                    {signboard ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signboard}
                        alt="看板画像"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-kosei-300 bg-white text-[11px] text-kosei-500">
                        未設定
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="chunk font-pop cursor-pointer rounded-xl bg-bbb-yellow px-4 py-3 text-center text-sm text-white shadow-[0_5px_0_#8A5A0F]">
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
                      <label className="chunk cursor-pointer rounded-xl border-2 border-kosei-300 px-4 py-3 text-center text-sm font-bold text-kosei-800 shadow-[0_5px_0_rgba(255,255,255,0.12)]">
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
                  {signboardError && (
                    <p className="font-read text-sm text-red-300">
                      {signboardError}
                    </p>
                  )}
                </div>
  
                <label className="mb-3 block">
                  <span className="font-read mb-1.5 block text-sm text-kosei-600">
                    カテゴリー
                  </span>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value as BoothGenre)}
                    className="w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
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
                  <span className="font-read mb-1.5 block text-sm text-kosei-600">詳細</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="来場者向けの企画説明を入力してください"
                    className="w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
                  />
                </label>
  
                <button
                  onClick={saveSetup}
                  disabled={savingSetup}
                  className="chunk font-pop w-full rounded-2xl bg-bbb-yellow p-4 text-lg text-white shadow-[0_6px_0_#8A5A0F] disabled:bg-kosei-100 disabled:text-kosei-300 disabled:shadow-none sm:col-span-2"
                >
                  {savingSetup ? "保存中..." : "保存する"}
                </button>

                {/* 保存を押さずに画面を閉じると入力が消えることを伝える。
                    途中まで書いて閉じてしまう事故がいちばん多いため。 */}
                <p className="font-read -mt-1 text-center text-sm leading-relaxed text-bbb-yellow sm:col-span-2">
                  入力が終わったら「保存する」を押してください。
                  <br />
                  押さずに画面を閉じると、入力した内容は消えて最初からになります。
                </p>
              </section>
          </div>
          {/* 運営からのれんらく。連絡が増えても画面全体が伸びないよう、
              高さを決めてこの枠の中だけスクロールさせる。 */}
          <section className="mb-4 flex max-h-[60vh] flex-col rounded-2xl border-2 border-kosei-300 bg-white p-4 lg:col-start-2 lg:mb-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]">
            <h2 className="font-logo mb-2 shrink-0 text-[13px] text-bbb-cyan">
              運営からのれんらく
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <AnnouncementBoard announcements={announcements} />
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[19rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch lg:gap-4">
          {/* 左：運営からのれんらく（枠の中だけスクロール）と、緊急連絡 */}
          <div className="order-2 flex flex-col gap-3 lg:order-none lg:h-full lg:min-h-0">
            <section className="flex max-h-[45vh] min-h-[12rem] flex-1 flex-col rounded-2xl border-2 border-kosei-300 bg-white p-3 lg:max-h-none lg:min-h-0">
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
              className="chunk font-pop min-h-[4.5rem] w-full shrink-0 rounded-2xl bg-bbb-red text-xl text-white shadow-[0_7px_0_#7E2822]"
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
          <div className="order-1 flex flex-col gap-3 lg:order-none lg:h-full lg:min-h-0">
            {/* 来場者からの見え方 */}
            <div className="rounded-2xl border-2 border-kosei-300 bg-white px-4 py-3 text-center">
              <p className="font-read text-[13px] text-kosei-600">
                いま来場者に表示されている状態
              </p>
              <span
                className={`font-pop mt-1.5 inline-block rounded-xl px-6 py-2 text-2xl sm:text-3xl ${statusBadgeClass(booth)}`}
              >
                {visitorStatusLabel(booth)}
              </span>
            </div>

            {booth.hasWaiting && (
              <section className="flex flex-col justify-center rounded-2xl border-2 border-kosei-300 bg-white p-4 lg:min-h-0 lg:flex-1">
                <p className="font-read mb-1 text-center text-[13px] text-kosei-600">
                  いまの混みぐあいを選んでください
                </p>
                <p className="font-read mb-3 text-center text-[12px] text-kosei-500">
                  選んだ内容は、そのまま来場者の地図に出ます
                </p>

                {/* 5つを横一列の正方形にならべる。
                    左が空いている・右が混んでいる、と場所で覚えられるので、
                    接客をしながらでも文字を読まずに押せる。
                    選んだものだけ、うすい色（パステル）で塗る。 */}
                <div className="grid grid-cols-5 gap-1.5">
                  {CROWD_LEVELS.map((c) => {
                    const chosen = crowdLevel === c.level;
                    return (
                      <button
                        key={c.level}
                        onClick={() => chooseCrowd(c.level)}
                        disabled={savingWait || booth.status !== "open"}
                        aria-label={c.label}
                        aria-pressed={chosen}
                        style={{
                          aspectRatio: "1 / 1",
                          backgroundColor: chosen ? c.soft : undefined,
                          borderColor: chosen ? c.color : undefined,
                          color: chosen ? c.color : undefined,
                        }}
                        className={`chunk flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-0.5 ${
                          chosen
                            ? "shadow-[0_4px_0_rgba(0,0,0,0.18)]"
                            : "border-kosei-300 bg-white text-kosei-600"
                        } disabled:border-kosei-200 disabled:bg-kosei-50 disabled:text-kosei-300 disabled:shadow-none`}
                      >
                        {/* 混みぐあいの目安。左から順に点が増える */}
                        <span className="flex items-end gap-[2px]" aria-hidden>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className="w-[3px] rounded-full"
                              style={{
                                height: `${4 + n * 1.6}px`,
                                backgroundColor:
                                  n <= c.level ? "currentColor" : "transparent",
                                outline:
                                  n <= c.level
                                    ? "none"
                                    : "1px solid currentColor",
                                opacity: n <= c.level ? 1 : 0.3,
                              }}
                            />
                          ))}
                        </span>
                        <span className="font-pop text-[11px] leading-tight">
                          {c.short}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* いま選ばれているものを、はっきり言葉で出す。
                    正方形の中の短い言葉だけだと、押し間違いに気づけないため。 */}
                <p className="font-pop mt-3 text-center text-lg">
                  {crowdLevel !== null ? (
                    <span style={{ color: crowdInfo(crowdLevel).color }}>
                      {crowdInfo(crowdLevel).label}
                    </span>
                  ) : (
                    <span className="text-kosei-500">えらんでください</span>
                  )}
                </p>

                {booth.status !== "open" ? (
                  <p className="font-read mt-3 text-center text-sm text-kosei-600">
                    {booth.status === "break"
                      ? "休憩中は変更できません"
                      : "終了しているため変更できません"}
                  </p>
                ) : crowdLevel === null ? (
                  <p className="font-read mt-3 text-center text-sm text-bbb-yellow">
                    まだ選ばれていません。来場者には「確認中」と出ています
                  </p>
                ) : null}
              </section>
            )}

            {/* 一時休憩（再開）と終了 */}
            <div className="grid grid-cols-2 gap-3">
              {booth.status === "break" || booth.status === "closed" ? (
                <button
                  onClick={() => changeStatus("open")}
                  disabled={changingStatus}
                  className="chunk font-pop min-h-[4.5rem] rounded-2xl bg-bbb-green text-lg text-white shadow-[0_6px_0_#1E6136]"
                >
                  再開する
                </button>
              ) : (
                <button
                  onClick={() => changeStatus("break")}
                  disabled={changingStatus || booth.status !== "open"}
                  className="chunk font-pop min-h-[4.5rem] rounded-2xl bg-bbb-cyan text-lg text-white shadow-[0_6px_0_#12495A] disabled:bg-kosei-100 disabled:text-kosei-300 disabled:shadow-none"
                >
                  一時休憩
                </button>
              )}
              <button
                onClick={() => setConfirmClose(true)}
                disabled={changingStatus || booth.status === "closed"}
                className="chunk font-pop min-h-[4.5rem] rounded-2xl border-[3px] border-[#FF5147] bg-[#FF5147]/10 text-lg text-[#FF7A72] shadow-[0_6px_0_#7E2822] disabled:border-kosei-300 disabled:bg-transparent disabled:text-kosei-300 disabled:shadow-none"
              >
                終了
              </button>
            </div>

            <button
              onClick={openLostItemModal}
              className="chunk font-pop min-h-[4.5rem] w-full rounded-2xl bg-bbb-blue text-lg text-white shadow-[0_6px_0_#0D3D4C]"
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
              className="chunk font-pop flex-1 rounded-xl bg-bbb-red p-4 text-base text-white shadow-[0_5px_0_#7E2822]"
            >
              終了
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="chunk flex-1 rounded-xl border-2 border-kosei-300 p-4 text-base font-bold text-kosei-800 shadow-[0_5px_0_rgba(255,255,255,0.12)]"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {lostItemOpen && (
        <Modal onClose={() => setLostItemOpen(false)}>
          <h2 className="font-pop mb-3 text-xl text-kosei-800">落とし物登録</h2>

          <label className="mb-3 block">
            <span className="font-read mb-1.5 block text-sm text-kosei-600">内容</span>
            <textarea
              value={lostItemDescription}
              onChange={(e) => setLostItemDescription(e.target.value)}
              rows={2}
              placeholder="拾得物の内容を入力してください"
              className="w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
            />
          </label>

          <label className="mb-3 block">
            <span className="font-read mb-1.5 block text-sm text-kosei-600">
              拾った場所
            </span>
            <input
              type="text"
              value={lostItemFoundLocation}
              onChange={(e) => setLostItemFoundLocation(e.target.value)}
              className="w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
            />
          </label>

          <label className="mb-4 block">
            <span className="font-read mb-1.5 block text-sm text-kosei-600">保管場所</span>
            <input
              type="text"
              value={lostItemStorageLocation}
              onChange={(e) => setLostItemStorageLocation(e.target.value)}
              placeholder="例）本部"
              className="w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={submitLostItem}
              disabled={lostItemSaving}
              className="chunk font-pop flex-1 rounded-xl bg-bbb-yellow p-4 text-base text-white shadow-[0_5px_0_#8A5A0F] disabled:bg-kosei-100 disabled:text-kosei-300 disabled:shadow-none"
            >
              {lostItemSaving ? "登録中..." : "登録する"}
            </button>
            <button
              onClick={() => setLostItemOpen(false)}
              className="chunk flex-1 rounded-xl border-2 border-kosei-300 p-4 text-base font-bold text-kosei-800 shadow-[0_5px_0_rgba(255,255,255,0.12)]"
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
            className="mb-3 w-full rounded-xl border-2 border-kosei-300 bg-white p-3 text-base text-kosei-800 placeholder:text-kosei-400"
          />
          <div className="flex gap-2">
            <button
              onClick={submitEmergency}
              disabled={emergencySending}
              className="chunk font-pop flex-1 rounded-xl bg-bbb-red p-4 text-base text-white shadow-[0_5px_0_#7E2822] disabled:opacity-50"
            >
              {emergencySending ? "送信中..." : "運営へ送信する"}
            </button>
            <button
              onClick={() => setEmergencyOpen(false)}
              className="chunk flex-1 rounded-xl border-2 border-kosei-300 p-4 text-base font-bold text-kosei-800 shadow-[0_5px_0_rgba(255,255,255,0.12)]"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
