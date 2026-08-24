// ダミー校内図（平面図）を生成するスクリプト
//
// 実際の校内図をもらったら、このスクリプトを差し替えるか、
// public/floorplans/ のSVGを本物に置き換えてください。
//
// 使い方: node scripts/generate-floorplans.mjs
//
// 生成先: public/floorplans/{area}-{floor}.svg
//   例) senior-4.svg, junior-1.svg, gym.svg, schoolyard.svg

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "floorplans");
// 部屋の座標一覧はアプリ側から import するので src/lib に置く
const ROOMS_JSON = join(__dirname, "..", "src", "lib", "floorplanRooms.json");

const W = 1200;
const H = 800;

// ダークテーマ前提の配色（アプリ本体が slate-950 背景のため）
const C = {
  bg: "#0b1220",
  outer: "#94a3b8",
  room: "#1e293b",
  roomStroke: "#64748b",
  corridor: "#111c30",
  corridorStroke: "#475569",
  special: "#0f2033",
  label: "#cbd5e1",
  sub: "#64748b",
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 部屋ひとつ分の矩形＋ラベル
function room(x, y, w, h, label, sub, fill = C.room) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${C.roomStroke}" stroke-width="3"/>
    <text x="${cx}" y="${sub ? cy - 6 : cy + 7}" fill="${C.label}" font-size="26" font-weight="700"
          text-anchor="middle" font-family="sans-serif">${esc(label)}</text>
    ${sub ? `<text x="${cx}" y="${cy + 24}" fill="${C.sub}" font-size="19" text-anchor="middle" font-family="sans-serif">${esc(sub)}</text>` : ""}`;
}

// 階段の記号（段々の線）
function stairs(x, y, w, h, label) {
  const steps = 6;
  let lines = "";
  for (let i = 1; i < steps; i++) {
    const ly = y + (h / steps) * i;
    lines += `<line x1="${x + 8}" y1="${ly}" x2="${x + w - 8}" y2="${ly}" stroke="${C.roomStroke}" stroke-width="2"/>`;
  }
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.special}" stroke="${C.roomStroke}" stroke-width="3"/>
    ${lines}
    <text x="${x + w / 2}" y="${y + h - 14}" fill="${C.sub}" font-size="19" text-anchor="middle" font-family="sans-serif">${esc(label)}</text>`;
}

function svgWrap(inner, caption) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${inner}
  <text x="${W - 20}" y="${H - 18}" fill="${C.sub}" font-size="20" text-anchor="end"
        font-family="sans-serif">${esc(caption)}（ダミー図面）</text>
</svg>`;
}

// ------------------------------------------------------------------
// 校舎の階（高校棟・中学棟）: 中央に廊下、上下に教室が並ぶ典型的な平面図
// ------------------------------------------------------------------
function buildingFloor({ areaLabel, floor, upper, lower, collected }) {
  const OX = 40; // 外壁の左
  const OY = 40; // 外壁の上
  const OW = W - 80;
  const OH = H - 80;

  const CORR_TOP = 355;
  const CORR_H = 90;

  const upperY = OY;
  const upperH = CORR_TOP - OY;
  const lowerY = CORR_TOP + CORR_H;
  const lowerH = OY + OH - lowerY;

  function rowCells(cells, y, h, collected) {
    let out = "";
    let x = OX;
    const totalWeight = cells.reduce((s, c) => s + (c.w ?? 1), 0);
    for (const cell of cells) {
      const cw = (OW * (cell.w ?? 1)) / totalWeight;
      if (cell.kind === "stairs") out += stairs(x, y, cw, h, cell.label);
      else if (cell.kind === "special") out += room(x, y, cw, h, cell.label, cell.sub, C.special);
      else out += room(x, y, cw, h, cell.label, cell.sub);
      // ピンを置くための部屋の中心座標を % で記録（階段・WCは企画が入らないので除外）
      if (cell.kind !== "stairs" && cell.label !== "WC") {
        collected.push({
          label: cell.label,
          x: Number((((x + cw / 2) / W) * 100).toFixed(2)),
          y: Number((((y + h / 2) / H) * 100).toFixed(2)),
        });
      }
      x += cw;
    }
    return out;
  }

  const inner = `
    <!-- 外壁 -->
    <rect x="${OX}" y="${OY}" width="${OW}" height="${OH}" fill="none" stroke="${C.outer}" stroke-width="6"/>
    <!-- 廊下 -->
    <rect x="${OX}" y="${CORR_TOP}" width="${OW}" height="${CORR_H}" fill="${C.corridor}" stroke="${C.corridorStroke}" stroke-width="3"/>
    <text x="${OX + 24}" y="${CORR_TOP + CORR_H / 2 + 7}" fill="${C.sub}" font-size="20" font-family="sans-serif">廊下</text>
    ${rowCells(upper, upperY, upperH, collected)}
    ${rowCells(lower, lowerY, lowerH, collected)}
    <!-- 方位（北） -->
    <g transform="translate(${W - 90}, 84)">
      <circle r="30" fill="none" stroke="${C.sub}" stroke-width="2"/>
      <path d="M 0 -20 L 8 12 L 0 5 L -8 12 Z" fill="${C.label}"/>
      <text x="0" y="-32" fill="${C.sub}" font-size="17" text-anchor="middle" font-family="sans-serif">N</text>
    </g>
    <text x="30" y="${H - 18}" fill="${C.label}" font-size="26" font-weight="700" font-family="sans-serif">${esc(areaLabel)} ${esc(floor)}</text>`;

  return svgWrap(inner, `${areaLabel} ${floor}`);
}

// 各階の部屋割り（ダミー）
const FLOOR_LAYOUTS = {
  senior: {
    label: "高校棟",
    floors: {
      4: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { label: "3-A" },
          { label: "3-B" },
          { label: "3-C" },
          { label: "3-D" },
        ],
        lower: [
          { label: "3-E" },
          { label: "3-F" },
          { kind: "special", label: "多目的室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      3: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { label: "2-A" },
          { label: "2-B" },
          { label: "2-C" },
          { label: "2-D" },
        ],
        lower: [
          { label: "2-E" },
          { label: "2-F" },
          { kind: "special", label: "視聴覚室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      2: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { label: "1-A" },
          { label: "1-B" },
          { label: "1-C" },
          { label: "1-D" },
        ],
        lower: [
          { label: "1-E" },
          { label: "1-F" },
          { kind: "special", label: "図書室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      1: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { kind: "special", label: "昇降口", sub: "正面入口", w: 1.4 },
          { kind: "special", label: "事務室" },
          { kind: "special", label: "職員室", w: 1.4 },
        ],
        lower: [
          { kind: "special", label: "本部", sub: "運営本部" },
          { kind: "special", label: "保健室" },
          { kind: "special", label: "会議室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      "-1": {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { kind: "special", label: "倉庫", w: 1.3 },
          { kind: "special", label: "機械室", w: 1.3 },
        ],
        lower: [
          { kind: "special", label: "部室A" },
          { kind: "special", label: "部室B" },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
    },
  },
  junior: {
    label: "中学棟",
    floors: {
      4: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { label: "中3-A" },
          { label: "中3-B" },
          { label: "中3-C" },
        ],
        lower: [
          { label: "中3-D" },
          { kind: "special", label: "理科室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      3: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { label: "中2-A" },
          { label: "中2-B" },
          { label: "中2-C" },
        ],
        lower: [
          { label: "中2-D" },
          { kind: "special", label: "音楽室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      2: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { label: "中1-A" },
          { label: "中1-B" },
          { label: "中1-C" },
        ],
        lower: [
          { label: "中1-D" },
          { kind: "special", label: "美術室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      1: {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { kind: "special", label: "昇降口", sub: "中学棟入口", w: 1.4 },
          { kind: "special", label: "相談室" },
          { kind: "special", label: "職員室", w: 1.2 },
        ],
        lower: [
          { kind: "special", label: "被服室" },
          { kind: "special", label: "調理室", w: 1.2 },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
      "-1": {
        upper: [
          { kind: "stairs", label: "階段", w: 0.7 },
          { kind: "special", label: "倉庫", w: 1.3 },
        ],
        lower: [
          { kind: "special", label: "部室C" },
          { kind: "special", label: "WC", w: 0.6 },
          { kind: "stairs", label: "階段", w: 0.7 },
        ],
      },
    },
  },
};

// ------------------------------------------------------------------
// 体育館: 大きなアリーナ＋ステージ＋入口
// ------------------------------------------------------------------
function gymPlan() {
  const inner = `
    <rect x="60" y="60" width="1080" height="680" fill="none" stroke="${C.outer}" stroke-width="6"/>
    <!-- ステージ -->
    ${room(120, 100, 960, 150, "ステージ", "発表・演奏はこちら", C.special)}
    <!-- アリーナ -->
    ${room(120, 290, 960, 320, "アリーナ", "観覧スペース")}
    <!-- コートのライン（雰囲気づけ） -->
    <rect x="200" y="330" width="800" height="240" fill="none" stroke="${C.corridorStroke}" stroke-width="2" stroke-dasharray="10 8"/>
    <line x1="600" y1="330" x2="600" y2="570" stroke="${C.corridorStroke}" stroke-width="2" stroke-dasharray="10 8"/>
    <!-- 入口・用具室 -->
    ${room(120, 640, 380, 70, "入口", "", C.special)}
    ${room(520, 640, 260, 70, "WC", "", C.special)}
    ${room(800, 640, 280, 70, "用具室", "", C.special)}
    <g transform="translate(${W - 90}, 110)">
      <circle r="30" fill="none" stroke="${C.sub}" stroke-width="2"/>
      <path d="M 0 -20 L 8 12 L 0 5 L -8 12 Z" fill="${C.label}"/>
      <text x="0" y="-32" fill="${C.sub}" font-size="17" text-anchor="middle" font-family="sans-serif">N</text>
    </g>
    <text x="30" y="${H - 18}" fill="${C.label}" font-size="26" font-weight="700" font-family="sans-serif">体育館</text>`;
  return svgWrap(inner, "体育館");
}

// ------------------------------------------------------------------
// 校庭: 屋外。トラックと屋台エリア
// ------------------------------------------------------------------
function schoolyardPlan() {
  const inner = `
    <rect x="40" y="40" width="1120" height="720" fill="${C.corridor}" stroke="${C.outer}" stroke-width="6"/>
    <!-- トラック -->
    <ellipse cx="600" cy="400" rx="420" ry="230" fill="none" stroke="${C.corridorStroke}" stroke-width="4" stroke-dasharray="14 10"/>
    <ellipse cx="600" cy="400" rx="330" ry="160" fill="none" stroke="${C.corridorStroke}" stroke-width="2" stroke-dasharray="8 8"/>
    <text x="600" y="408" fill="${C.sub}" font-size="24" text-anchor="middle" font-family="sans-serif">グラウンド</text>
    <!-- 屋台エリア -->
    ${room(80, 90, 260, 130, "屋台エリアA", "テント3張", C.special)}
    ${room(860, 90, 260, 130, "屋台エリアB", "テント3張", C.special)}
    ${room(80, 580, 260, 130, "屋台エリアC", "テント2張", C.special)}
    ${room(860, 580, 260, 130, "休憩スペース", "ベンチ・給水", C.special)}
    <!-- 正門 -->
    ${room(460, 690, 280, 60, "正門", "", C.special)}
    <g transform="translate(${W - 90}, 400)">
      <circle r="30" fill="none" stroke="${C.sub}" stroke-width="2"/>
      <path d="M 0 -20 L 8 12 L 0 5 L -8 12 Z" fill="${C.label}"/>
      <text x="0" y="-32" fill="${C.sub}" font-size="17" text-anchor="middle" font-family="sans-serif">N</text>
    </g>
    <text x="30" y="${H - 18}" fill="${C.label}" font-size="26" font-weight="700" font-family="sans-serif">校庭</text>`;
  return svgWrap(inner, "校庭");
}

// ------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });

// 図面と一緒に「部屋の中心座標一覧」も出力する。
// 企画のピンを部屋の上に正確に置くために使う。
// （本物の校内図に差し替えるときは、この rooms.json も作り直す）
const roomIndex = {};

let count = 0;
for (const [areaId, area] of Object.entries(FLOOR_LAYOUTS)) {
  for (const [floor, layout] of Object.entries(area.floors)) {
    const floorLabel = floor === "-1" ? "B1" : `${floor}F`;
    const collected = [];
    const svg = buildingFloor({
      areaLabel: area.label,
      floor: floorLabel,
      upper: layout.upper,
      lower: layout.lower,
      collected,
    });
    writeFileSync(join(OUT_DIR, `${areaId}-${floor}.svg`), svg);
    roomIndex[`${areaId}-${floor}`] = collected;
    count++;
  }
}

writeFileSync(join(OUT_DIR, "gym.svg"), gymPlan());
roomIndex["gym"] = [
  { label: "ステージ", x: 50, y: 21.9 },
  { label: "アリーナ左", x: 32, y: 56.3 },
  { label: "アリーナ右", x: 68, y: 56.3 },
];
count++;

writeFileSync(join(OUT_DIR, "schoolyard.svg"), schoolyardPlan());
roomIndex["schoolyard"] = [
  { label: "屋台エリアA", x: 17.5, y: 19.4 },
  { label: "屋台エリアB", x: 82.5, y: 19.4 },
  { label: "屋台エリアC", x: 17.5, y: 80.6 },
  { label: "休憩スペース", x: 82.5, y: 80.6 },
];
count++;

writeFileSync(ROOMS_JSON, JSON.stringify(roomIndex, null, 2) + "\n");

console.log(
  `生成完了: 図面${count}枚 → public/floorplans/ , 部屋座標 → src/lib/floorplanRooms.json`
);
