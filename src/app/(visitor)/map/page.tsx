"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import PannableZoom from "@/components/PannableZoom";
import FloorSlider from "@/components/FloorSlider";
import DetailSheet from "@/components/DetailSheet";
import BoothDetail from "@/components/BoothDetail";
import { subscribeVisitorBooths, type Booth } from "@/lib/booth";
import {
  placeBooths,
  waitMinutesOfBooth,
  type PlacedBooth,
} from "@/lib/boothPlacement";
import {
  floorplanSrc,
  hasFloors,
  roomsFor,
  type AreaId,
} from "@/lib/floorplan";
import { pinLook, PIN_LEGEND } from "@/lib/waitColor";

const areas: { id: AreaId; name: string }[] = [
  { id: "gym", name: "体育館" },
  { id: "senior", name: "高校棟" },
  { id: "junior", name: "中学棟" },
  { id: "schoolyard", name: "校庭" },
];

const floors = [4, 3, 2, 1];

// この倍率より小さいあいだは、待ち時間の数字を出さずに色の点だけにする。
// 全体表示のままだと教室1つが画面上40px台しかなく、数字と名前の両方は入らない。
// 少し拡大すればすぐ数字が出るよう、しきい値は低めにしてある。
const SHOW_TIME_SCALE = 1.2;

// 縮小しているときは長い企画名を切る
function shortName(name: string): string {
  return name.length > 8 ? `${name.slice(0, 8)}…` : name;
}

function MapContent() {
  const searchParams = useSearchParams();
  const areaParam = searchParams.get("area");
  const initialArea: AreaId = areas.some((a) => a.id === areaParam)
    ? (areaParam as AreaId)
    : "gym";

  const [activeArea, setActiveArea] = useState<AreaId>(initialArea);
  const [activeFloor, setActiveFloor] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  // 色の説明。最初は開いておき、地図に触れたら畳む
  const [legendOpen, setLegendOpen] = useState(true);
  // 図面の横縦比。体育館は縦長なので、横幅に合わせると画面からはみ出す。
  // 読み込んだ図の実際の比率を使って、全体が収まる大きさで出す。
  const [planRatio, setPlanRatio] = useState<number | null>(null);

  // 企画の情報をリアルタイムで受け取る（待ち時間もその場で変わる）
  useEffect(() => subscribeVisitorBooths(setBooths), []);

  // 地図をドラッグして動かしたときに、指を置いた場所のピンが
  // 誤ってタップ扱いになるのを防ぐ。押した位置から一定以上動いていたら
  // 「移動」とみなして詳細を開かない。
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 8;

  function handlePinPress(e: React.PointerEvent) {
    pressPoint.current = { x: e.clientX, y: e.clientY };
  }

  function handlePinClick(e: React.MouseEvent, booth: PlacedBooth) {
    const start = pressPoint.current;
    pressPoint.current = null;
    if (start) {
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > DRAG_THRESHOLD_PX) return;
    }
    setSelectedId(booth.id);
  }

  const showFloors = hasFloors(activeArea);
  const floor = showFloors ? activeFloor : undefined;

  const rooms = useMemo(
    () => placeBooths(booths, activeArea, floor),
    [booths, activeArea, floor],
  );
  const planSrc = floorplanSrc(activeArea, floor);
  // 図面に薄く敷く部屋名（教室名）。企画が無い部屋も出す目印になる
  const roomLabels = roomsFor(activeArea, floor);

  // 企画名を上下ジグザグに振り分けるための「段」を決める。
  // 教室は横一列に並ぶので、隣同士でラベルがぶつかる。左から順に
  // 0段目・1段目を交互に割り当てると、実効的な間隔が2倍になって収まる。
  const laneOf = useMemo(() => {
    const rows = new Map<number, PlacedBooth[]>();
    for (const b of rooms) {
      // yが近いものは同じ行とみなす（図面の高さの6%きざみ）
      const key = Math.round(b.y / 6);
      const arr = rows.get(key) ?? [];
      arr.push(b);
      rows.set(key, arr);
    }
    const lane = new Map<string, number>();
    for (const arr of rows.values()) {
      arr.sort((a, b) => a.x - b.x);
      arr.forEach((b, i) => lane.set(b.id, i % 2));
    }
    return lane;
  }, [rooms]);
  // 選んでいる企画。一覧が更新されても最新の内容が出るようIDで引く
  const selected = booths.find((b) => b.id === selectedId) ?? null;

  return (
    <>
      <div
        className="fixed inset-x-0 top-0"
        style={{ bottom: "calc(69px + max(env(safe-area-inset-bottom), 10px))" }}
      >
        <PannableZoom
          className="h-full w-full bg-kosei-50"
          onInteract={() => setLegendOpen(false)}
        >
          {/* 拡大率を受け取り、縮小しているあいだは企画名を出さないようにする */}
          {(scale) => (
            <div className="flex h-full w-full items-center justify-center">
              {/* フロア全体が一目で見えるよう横幅に合わせる。枠が図とぴったり
                  重なるので、ピンの%座標がそのまま図面上の位置と一致する。
                  containerType は、部屋名の文字を図面の幅に対する割合で
                  決めるために付けている。 */}
              <div
                className="relative"
                style={{
                  containerType: "inline-size",
                  width: "100%",
                  aspectRatio: planRatio ?? undefined,
                  maxHeight: "100%",
                  maxWidth: "100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={planSrc}
                  alt=""
                  draggable={false}
                  className="block h-full w-full select-none"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    if (el.naturalHeight > 0)
                      setPlanRatio(el.naturalWidth / el.naturalHeight);
                  }}
                />

                {/* 部屋の名前。図面に印刷されているように見せたいので、
                    ピンと違って拡大率の打ち消しをしない（図と一緒に伸び縮みする）。 */}
                {roomLabels.map((r) => (
                  <span
                    key={r.label}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-heading font-black text-kosei-800/25"
                    style={{
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      fontSize: "2.6cqw",
                    }}
                  >
                    {r.label}
                  </span>
                ))}

                {rooms.map((room) => {
                  const minutes = waitMinutesOfBooth(room);
                  const look = pinLook(room.status, minutes);
                  // 少しでも拡大したら待ち時間の数字を出す
                  const showTime = scale >= SHOW_TIME_SCALE;
                  // 0段目・1段目。名前を上下（または上下2段）に振り分ける
                  const lane = laneOf.get(room.id) ?? 0;
                  const name = room.projectName || room.name;
                  return (
                    <button
                      key={room.id}
                      onPointerDown={handlePinPress}
                      onClick={(e) => handlePinClick(e, room)}
                      // 大きさを持たない点として置き、まわりに中身を配置する。
                      // こうすると left/top がそのまま「ピンが指す場所」になる。
                      className="absolute h-0 w-0"
                      style={{
                        left: `${room.x}%`,
                        top: `${room.y}%`,
                        transform: "scale(calc(1 / var(--map-scale, 1)))",
                        transformOrigin: "center",
                        transition: "transform 0.15s ease-out",
                        opacity: look.faded ? 0.75 : 1,
                        zIndex: lane === 0 ? 2 : 1,
                      }}
                    >
                      {/* 指で押せる範囲。見た目より広くとっておく */}
                      <span className="absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full" />

                      {showTime ? (
                        <>
                          {/* 吹き出しの脚。回した四角の下半分だけが見える */}
                          <span
                            className="absolute bottom-px left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white"
                            style={{ backgroundColor: look.bg }}
                          />
                          {/* 吹き出し本体（待ち時間） */}
                          <span
                            className="absolute bottom-[7px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-white px-2 py-[4px] font-heading text-[14px] font-black leading-none text-white shadow-[0_3px_0_rgba(18,73,90,0.45)]"
                            style={{ backgroundColor: look.bg }}
                          >
                            {look.text}
                          </span>
                        </>
                      ) : (
                        // 全体表示のあいだは色の点だけ。混み具合は色で伝える
                        <span
                          className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_0_rgba(18,73,90,0.4)]"
                          style={{ backgroundColor: look.bg }}
                        />
                      )}

                      {/* 企画名はいつでも出す。地図を開いた時点で「何があるか」が
                          分からないと地図の意味がないため。白いフチを付けて
                          下の図面が透けるようにしている。 */}
                      <span
                        // 白いフチだけだと図面の線が文字に透けて読みにくいので、
                        // 半透明の白い下地を敷いている。完全な白にしないのは、
                        // 四角が並んで地図が塊だらけに見えるのを避けるため。
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/90 px-1.5 py-px font-heading text-[13px] font-black leading-tight text-kosei-800 ring-1 ring-white"
                        style={{
                          // 数字が出ているときは吹き出しの下に2段で、
                          // 点だけのときは点の上下に振り分ける
                          top: showTime
                            ? lane === 0
                              ? "8px"
                              : "27px"
                            : lane === 0
                              ? undefined
                              : "11px",
                          bottom:
                            !showTime && lane === 0 ? "11px" : undefined,
                        }}
                      >
                        {showTime ? name : shortName(name)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PannableZoom>

        {/* 色の見方。最初は開いておき、地図に触れたら畳む */}
        <div className="absolute right-3 top-[84px] z-20">
          {legendOpen ? (
            <div className="animate-fade-in-up rounded-2xl border-2 border-kosei-700 bg-white/95 p-2.5 shadow-[0_3px_0_var(--color-kosei-700)]">
              <p className="mb-1.5 text-[10px] font-bold text-kosei-800">
                ピンの色
              </p>
              <ul className="space-y-1">
                {PIN_LEGEND.map((l) => (
                  <li key={l.label} className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-[10px] font-bold text-kosei-800">
                      {l.label}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setLegendOpen(false)}
                className="mt-1.5 w-full rounded-full bg-kosei-100 py-0.5 text-[10px] font-bold text-kosei-700"
              >
                閉じる
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLegendOpen(true)}
              className="pressable rounded-full border-2 border-kosei-700 bg-white px-3 py-1.5 text-[11px] font-bold text-kosei-700 shadow-[0_3px_0_var(--color-kosei-700)]"
            >
              色の見方
            </button>
          )}
        </div>

        {/* 上部オーバーレイ：エリア選択 */}
        <div className="animate-fade-in-up pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-kosei-50 via-kosei-50/90 to-transparent p-3 pt-4">
          <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-2">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveArea(area.id)}
                className={`pressable flex h-14 items-center justify-center rounded-full border-2 px-2 text-xs font-bold ${
                  activeArea === area.id
                    ? "border-kosei-800 bg-kosei-500 text-white shadow-[0_3px_0_var(--color-kosei-800)]"
                    : "border-kosei-700 bg-white text-kosei-700 shadow-[0_3px_0_var(--color-kosei-700)]"
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
          <p className="pointer-events-none mt-2 text-center text-xs font-bold text-kosei-600">
            {rooms.length === 0
              ? "このフロアに企画はありません"
              : "ピンチ／Ctrl+ホイールで拡大縮小、ドラッグで移動できます"}
          </p>
        </div>

        {showFloors && (
          <FloorSlider
            floors={floors}
            value={activeFloor}
            onChange={setActiveFloor}
            className="bottom-6"
          />
        )}
      </div>

      <DetailSheet open={selected != null} onClose={() => setSelectedId(null)}>
        {selected && <BoothDetail booth={selected} />}
      </DetailSheet>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapContent />
    </Suspense>
  );
}
