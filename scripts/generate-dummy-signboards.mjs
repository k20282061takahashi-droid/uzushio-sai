// 企画の看板画像のダミー（イラスト）を作るスクリプト。
// 本物の看板写真が集まるまでの仮置きです。
//
// 使い方: node scripts/generate-dummy-signboards.mjs
// 生成先: public/dummy/booth-1.svg 〜 booth-8.svg

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "dummy");

const W = 640;
const H = 360;

// 看板っぽい配色を何種類か用意する
const THEMES = [
  { bg: "#7f1d1d", accent: "#fca5a5", label: "お化け屋敷", icon: "ghost" },
  { bg: "#78350f", accent: "#fcd34d", label: "カフェ", icon: "cup" },
  { bg: "#164e63", accent: "#67e8f9", label: "脱出ゲーム", icon: "key" },
  { bg: "#14532d", accent: "#86efac", label: "縁日", icon: "star" },
  { bg: "#3b0764", accent: "#d8b4fe", label: "プラネタリウム", icon: "star" },
  { bg: "#7c2d12", accent: "#fdba74", label: "屋台", icon: "cup" },
  { bg: "#1e3a8a", accent: "#93c5fd", label: "展示", icon: "frame" },
  { bg: "#831843", accent: "#f9a8d4", label: "ステージ", icon: "note" },
];

function icon(kind, accent) {
  const cx = 320;
  const cy = 150;
  switch (kind) {
    case "ghost":
      return `<path d="M${cx - 46} ${cy + 46} L${cx - 46} ${cy - 10}
              a46 46 0 0 1 92 0 L${cx + 46} ${cy + 46}
              l-23 -18 -23 18 -23 -18 Z" fill="${accent}" opacity="0.9"/>
              <circle cx="${cx - 16}" cy="${cy - 8}" r="7" fill="${"#0f172a"}"/>
              <circle cx="${cx + 16}" cy="${cy - 8}" r="7" fill="${"#0f172a"}"/>`;
    case "cup":
      return `<path d="M${cx - 42} ${cy - 30} h74 v44 a37 37 0 0 1 -74 0 Z" fill="${accent}"/>
              <path d="M${cx + 32} ${cy - 18} h16 a16 16 0 0 1 0 32 h-16" fill="none" stroke="${accent}" stroke-width="8"/>
              <rect x="${cx - 54}" y="${cy + 26}" width="98" height="10" rx="5" fill="${accent}" opacity="0.7"/>`;
    case "key":
      return `<circle cx="${cx - 30}" cy="${cy}" r="30" fill="none" stroke="${accent}" stroke-width="12"/>
              <rect x="${cx - 4}" y="${cy - 7}" width="76" height="14" rx="6" fill="${accent}"/>
              <rect x="${cx + 46}" y="${cy + 7}" width="12" height="20" rx="4" fill="${accent}"/>`;
    case "star":
      return `<path d="M${cx} ${cy - 48} l14 32 35 4 -26 24 7 34 -30 -18 -30 18 7 -34 -26 -24 35 -4 Z" fill="${accent}"/>`;
    case "frame":
      return `<rect x="${cx - 52}" y="${cy - 40}" width="104" height="80" rx="6" fill="none" stroke="${accent}" stroke-width="9"/>
              <path d="M${cx - 40} ${cy + 26} l28 -34 20 22 14 -16 20 28 Z" fill="${accent}"/>`;
    default:
      return `<circle cx="${cx - 22}" cy="${cy + 26}" r="16" fill="${accent}"/>
              <circle cx="${cx + 30}" cy="${cy + 16}" r="16" fill="${accent}"/>
              <rect x="${cx - 10}" y="${cy - 44}" width="8" height="72" fill="${accent}"/>
              <rect x="${cx + 42}" y="${cy - 54}" width="8" height="72" fill="${accent}"/>
              <path d="M${cx - 10} ${cy - 44} L${cx + 50} ${cy - 54} v14 L${cx - 10} ${cy - 30} Z" fill="${accent}"/>`;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

THEMES.forEach((t, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="14" fill="none" stroke="${t.accent}" stroke-width="4" opacity="0.5"/>
  ${icon(t.icon, t.accent)}
  <text x="${W / 2}" y="${H - 56}" fill="#ffffff" font-size="42" font-weight="700"
        text-anchor="middle" font-family="sans-serif">${t.label}</text>
  <text x="${W / 2}" y="${H - 26}" fill="${t.accent}" font-size="18"
        text-anchor="middle" font-family="sans-serif">看板画像のダミーです</text>
</svg>`;
  writeFileSync(join(OUT_DIR, `booth-${i + 1}.svg`), svg);
});

console.log(`看板ダミー ${THEMES.length}枚 → public/dummy/`);
