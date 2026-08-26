"use client";

import { useEffect, useMemo, useState } from "react";
import BoothFilterBar from "./BoothFilterBar";
import BoothMapPicker from "./BoothMapPicker";
import BulkImportFloat from "./BulkImportFloat";
import FloatPanel from "./FloatPanel";
import QrCode from "./QrCode";
import {
  BOOTH_TYPE_LABELS,
  GENRE_LABELS,
  type Booth,
  type BoothGenre,
  type BoothType,
  createBooth,
  deleteBooth,
  subscribeBooths,
  updateBooth,
} from "@/lib/booth";
import {
  groupAndSortBooths,
  isWaitingStale,
  STATUS_LABELS,
  waitMinutesOf,
  type GroupKey,
  type SortKey,
} from "@/lib/boothGrouping";
import { type AreaId } from "@/lib/floorplan";

// ステータスは小さな点＋文字で示す（塗りつぶしのタグは数が並ぶとうるさいため）
function statusDotClass(booth: Booth): string {
  if (booth.status === "open") return "bg-emerald-400";
  if (booth.status === "break") return "bg-amber-400";
  return "bg-neutral-600";
}

const AREA_NAMES: Record<AreaId, string> = {
  senior: "高校棟",
  junior: "中学棟",
  gym: "体育館",
  schoolyard: "校庭",
};

// 企画1件のカード
function BoothCard({
  booth,
  selected,
  onSelect,
  onOpenDetail,
  stale,
}: {
  booth: Booth;
  selected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
  stale: boolean;
}) {
  const minutes = waitMinutesOf(booth);

  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer gap-3 overflow-hidden rounded-xl border bg-neutral-950/55 p-2.5 transition-colors hover:bg-white/[0.08] ${
        selected ? "border-emerald-400 ring-1 ring-emerald-400" : "border-white/10"
      }`}
    >
      {/* 看板画像（小さめのサムネイル） */}
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-neutral-950">
        {booth.signboardUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booth.signboardUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-[12px] leading-tight text-neutral-400">
            画像
            <br />
            未登録
          </div>
        )}
      </div>

      {/* 本文 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-neutral-100">
              {booth.projectName || "（企画名未設定）"}
            </p>
            <p className="truncate text-[12px] text-neutral-500">{booth.name}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="flex items-center gap-1.5 text-[12px] text-neutral-400">
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusDotClass(booth)}`}
              />
              {STATUS_LABELS[booth.status]}
            </span>
            {stale && (
              <span className="text-[12px] text-amber-300">待ち未更新</span>
            )}
          </div>
        </div>

        <p className="mt-0.5 truncate text-[12px] text-neutral-400">
          {BOOTH_TYPE_LABELS[booth.type] ?? booth.type}
          {booth.genre && ` ・ ${GENRE_LABELS[booth.genre]}`}
          {" ・ "}
          {booth.location
            ? `${booth.location}${
                booth.floor != null
                  ? ` ${booth.floor === -1 ? "B1" : `${booth.floor}F`}`
                  : ""
              }${booth.roomName ? ` ${booth.roomName}` : ""}`
            : "場所未設定"}
        </p>

        <p className="mt-0.5 truncate text-[12px] leading-snug text-neutral-400">
          {booth.description || "（説明未入力）"}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-1">
          {minutes !== null ? (
            <span className="rounded bg-neutral-900/75 px-1.5 py-0.5 text-[12px] text-neutral-200">
              待ち {minutes}分
            </span>
          ) : (
            <span className="rounded bg-neutral-950/55 px-1.5 py-0.5 text-[12px] text-neutral-400">
              待ち時間なし
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
            className="ml-auto rounded-lg bg-neutral-900/75 px-2.5 py-1 text-[12px] font-medium active:scale-95"
          >
            詳細・編集
          </button>
        </div>
      </div>
    </div>
  );
}

// 企画の詳細フロート
function BoothDetailFloat({
  booth,
  onClose,
}: {
  booth: Booth | null;
  onClose: () => void;
}) {
  if (!booth) return null;
  // key を付けることで、別の企画を開いたときに入力欄が作り直される
  return <BoothDetailForm key={booth.id} booth={booth} onClose={onClose} />;
}

function BoothDetailForm({
  booth,
  onClose,
}: {
  booth: Booth;
  onClose: () => void;
}) {
  const [projectName, setProjectName] = useState(booth.projectName ?? "");
  const [name, setName] = useState(booth.name);
  const [description, setDescription] = useState(booth.description);
  const [genre, setGenre] = useState<BoothGenre | "">(booth.genre ?? "");
  const [type, setType] = useState<BoothType>(booth.type);
  const [hasWaiting, setHasWaiting] = useState(booth.hasWaiting);
  const [timePerGroup, setTimePerGroup] = useState<number | "">(
    booth.timePerGroup ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const manageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/manage/${booth.accessToken}`
      : `/manage/${booth.accessToken}`;

  async function save() {
    setSaving(true);
    await updateBooth(booth.id, {
      projectName: projectName || null,
      name,
      description,
      genre: genre || null,
      type,
      hasWaiting,
      timePerGroup: timePerGroup === "" ? null : Number(timePerGroup),
    });
    setSaving(false);
    setSaved(true);
  }

  const minutes = waitMinutesOf(booth);

  return (
    <FloatPanel
      open
      title={booth.projectName || booth.name}
      subtitle={`${booth.name} ・ ${BOOTH_TYPE_LABELS[booth.type] ?? booth.type}`}
      onClose={onClose}
      width="wide"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左：現在の状態と看板 */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-neutral-300">今の状態</h3>
          <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
            {booth.signboardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={booth.signboardUrl}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center text-xs text-neutral-400">
                看板画像は未登録です
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">状態</span>
              <span className="flex items-center gap-1.5 text-neutral-100">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusDotClass(booth)}`}
                />
                {STATUS_LABELS[booth.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">待ち時間</span>
              <span>
                {minutes !== null ? `約${minutes}分` : "待ち時間なし"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">待ちグループ数</span>
              <span>
                {booth.hasWaiting ? `${booth.waitingGroups ?? 0}組` : "―"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">情報の入力</span>
              <span>{booth.isSetupDone ? "済み" : "未完了"}</span>
            </div>
          </div>

          <h3 className="mb-2 mt-4 text-sm font-medium text-neutral-300">
            企画担当者用のQRコード
          </h3>
          <QrCode value={manageUrl} label={booth.name} />
          <div className="mt-2 flex items-center gap-1">
            <input
              readOnly
              value={manageUrl}
              className="flex-1 truncate rounded-lg border border-white/10 bg-neutral-950 p-2 text-[13px] text-neutral-400"
            />
            <button
              onClick={() => navigator.clipboard.writeText(manageUrl)}
              className="shrink-0 rounded-lg bg-neutral-900/75 px-2 py-2 text-[13px] active:scale-95"
            >
              URLをコピー
            </button>
          </div>
        </section>

        {/* 中央：編集 */}
        <section className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-medium text-neutral-300">企画の設定</h3>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">クラス・団体名</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">企画名</span>
              <input
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setSaved(false);
                }}
                placeholder="例）壊れるローラーコースター"
                className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">種別</span>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as BoothType);
                  setSaved(false);
                }}
                className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2 text-sm"
              >
                {Object.entries(BOOTH_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">カテゴリー</span>
              <select
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value as BoothGenre | "");
                  setSaved(false);
                }}
                className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2 text-sm"
              >
                <option value="">未設定</option>
                {Object.entries(GENRE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-neutral-400">説明</span>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              rows={4}
              placeholder="来場者向けの説明。企画担当者が自分で入力することもできます"
              className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2 text-sm"
            />
          </label>

          <div className="mt-3 rounded-lg border border-white/10 bg-neutral-950/55 p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasWaiting}
                onChange={(e) => {
                  setHasWaiting(e.target.checked);
                  setSaved(false);
                }}
                className="accent-emerald-500"
              />
              待ち時間の仕組みを使う
            </label>
            <p className="mt-1 text-[13px] text-neutral-400">
              入れると、企画担当者が待ちグループ数を入力でき、来場者のマップに待ち時間が出ます。
            </p>
            {hasWaiting && (
              <label className="mt-2 block">
                <span className="mb-1 block text-xs text-neutral-400">
                  1グループあたりの所要時間（分）
                </span>
                <input
                  type="number"
                  value={timePerGroup}
                  onChange={(e) => {
                    setTimePerGroup(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    setSaved(false);
                  }}
                  className="w-32 rounded-lg border border-white/10 bg-neutral-950 p-2 text-sm"
                />
              </label>
            )}
          </div>

          <p className="mt-3 text-[13px] text-neutral-400">
            ※ 場所（部屋）は、この画面を閉じたあと右側の地図から設定できます。
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-500 p-2.5 text-sm font-medium text-white active:scale-95 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            {confirmDelete ? (
              <>
                <button
                  onClick={async () => {
                    await deleteBooth(booth.id);
                    onClose();
                  }}
                  className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white active:scale-95"
                >
                  本当に削除する
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg bg-neutral-900/75 px-4 py-2.5 text-sm active:scale-95"
                >
                  やめる
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg bg-red-500/20 px-4 py-2.5 text-sm text-red-200 active:scale-95"
              >
                この企画を削除
              </button>
            )}
          </div>
          {saved && <p className="mt-2 text-xs text-emerald-400">保存しました</p>}
        </section>
      </div>
    </FloatPanel>
  );
}

export default function BoothsTab({ onDataUpdate }: { onDataUpdate: () => void }) {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [groupKey, setGroupKey] = useState<GroupKey>("location");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  // 画面が狭いときは地図を出すと窮屈なので、最初は隠しておく
  const [showMap, setShowMap] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1024,
  );
  const [now, setNow] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(
    () =>
      subscribeBooths((v) => {
        setBooths(v);
        onDataUpdate();
      }),
    [onDataUpdate],
  );

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(
    () =>
      search
        ? booths.filter(
            (b) =>
              b.name.includes(search) || (b.projectName ?? "").includes(search),
          )
        : booths,
    [booths, search],
  );

  const groups = useMemo(
    () => groupAndSortBooths(filtered, groupKey, sortKey),
    [filtered, groupKey, sortKey],
  );

  const selected = booths.find((b) => b.id === selectedId) ?? null;
  const detail = booths.find((b) => b.id === detailId) ?? null;

  // 地図の部屋を押したとき、選んでいる企画の場所として保存する
  async function pickRoom(area: AreaId, floor: number | undefined, room: string) {
    if (!selected) return;
    await updateBooth(selected.id, {
      location: AREA_NAMES[area],
      floor: floor ?? null,
      roomName: room,
    });
  }

  async function addBooth() {
    if (!newName.trim()) return;
    await createBooth({ name: newName.trim(), type: "class" });
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BoothFilterBar
        groupKey={groupKey}
        onGroupChange={setGroupKey}
        sortKey={sortKey}
        onSortChange={setSortKey}
        search={search}
        onSearchChange={setSearch}
        right={
          <>
            <button
              onClick={() => setShowMap((v) => !v)}
              className="rounded-lg bg-neutral-900/75 px-3.5 py-2 text-sm text-neutral-200 active:scale-95"
            >
              {showMap ? "地図を隠す" : "地図を表示"}
            </button>
            <button
              onClick={() => setAdding(true)}
              className="rounded-lg bg-neutral-900/75 px-3.5 py-2 text-sm text-neutral-200 active:scale-95"
            >
              ＋ 1件追加
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-bold text-white active:scale-95"
            >
              まとめて登録
            </button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-5">
        {/* 企画カード一覧 */}
        <div
          className={`min-h-[24rem] overflow-y-auto pr-1 lg:min-h-0 ${showMap ? "lg:col-span-3" : "lg:col-span-5"}`}
        >
          {groups.map((group) => (
            <div key={group.label || "all"} className="mb-4">
              {group.label && (
                <p className="sticky top-0 z-10 mb-2 bg-neutral-950/90 py-1 text-xs font-bold text-neutral-400 backdrop-blur">
                  {group.label}（{group.booths.length}）
                </p>
              )}
              <div
                className={`grid gap-2 ${
                  showMap
                    ? "grid-cols-1 lg:grid-cols-2"
                    : "grid-cols-2 2xl:grid-cols-3"
                }`}
              >
                {group.booths.map((b) => (
                  <BoothCard
                    key={b.id}
                    booth={b}
                    selected={selectedId === b.id}
                    onSelect={() =>
                      setSelectedId(selectedId === b.id ? null : b.id)
                    }
                    onOpenDetail={() => setDetailId(b.id)}
                    stale={now ? isWaitingStale(b, now) : false}
                  />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-neutral-400">該当する企画がありません</p>
          )}
        </div>

        {/* 地図 */}
        {showMap && (
          <div className="min-h-[24rem] lg:min-h-0 lg:col-span-2">
            <div className="flex h-full flex-col rounded-xl border border-white/10 bg-neutral-950/55 p-3">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-medium text-neutral-300">地図</h2>
                {selected ? (
                  <p className="truncate text-[13px] text-emerald-300">
                    選択中：{selected.name}
                  </p>
                ) : (
                  <p className="text-[13px] text-neutral-400">
                    企画を選ぶと場所を設定できます
                  </p>
                )}
              </div>
              <div className="min-h-0 flex-1">
                <BoothMapPicker
                  booths={booths}
                  selectedBooth={selected}
                  onPickRoom={pickRoom}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <BoothDetailFloat booth={detail} onClose={() => setDetailId(null)} />
      <BulkImportFloat
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        existingBooths={booths}
      />

      <FloatPanel
        open={adding}
        title="企画を1件追加"
        onClose={() => setAdding(false)}
        width="narrow"
      >
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">
            クラス名・団体名
          </span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例）3年A組"
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-2.5 text-sm"
          />
        </label>
        <p className="mt-2 text-[13px] text-neutral-400">
          管理用URLは自動で発行されます。種別・場所・説明は追加したあとで設定できます。
        </p>
        <button
          onClick={addBooth}
          disabled={!newName.trim()}
          className="mt-4 w-full rounded-lg bg-emerald-500 p-2.5 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
        >
          追加する
        </button>
      </FloatPanel>
    </div>
  );
}
