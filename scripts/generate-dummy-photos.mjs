// 落とし物のダミー写真（イラスト）を作るスクリプト。
// 本物の写真が用意できるまでの仮置きです。
//
// 使い方: node scripts/generate-dummy-photos.mjs
// 生成先: public/dummy/lost-*.svg

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "dummy");

const W = 400;
const H = 400;

function wrap(bg, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  ${inner}
</svg>`;
}

const items = {
  // 水筒
  "lost-bottle": wrap(
    "#1e293b",
    `<rect x="150" y="120" width="100" height="200" rx="26" fill="#38bdf8" stroke="#0ea5e9" stroke-width="6"/>
     <rect x="170" y="86" width="60" height="42" rx="10" fill="#0f172a" stroke="#334155" stroke-width="5"/>
     <rect x="163" y="180" width="74" height="46" rx="8" fill="#0ea5e9" opacity="0.55"/>
     <circle cx="200" cy="203" r="14" fill="#e0f2fe" opacity="0.7"/>`,
  ),
  // 折りたたみ傘
  "lost-umbrella": wrap(
    "#1e293b",
    `<path d="M70 200 A130 130 0 0 1 330 200 Z" fill="#f87171" stroke="#ef4444" stroke-width="6"/>
     <path d="M70 200 q32 -34 65 0 q32 -34 65 0 q32 -34 65 0 q32 -34 65 0" fill="#1e293b" opacity="0.25"/>
     <rect x="194" y="200" width="12" height="112" rx="6" fill="#e2e8f0"/>
     <path d="M200 312 q0 26 -26 26 q-16 0 -16 -14" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>`,
  ),
  // 財布
  "lost-wallet": wrap(
    "#1e293b",
    `<rect x="90" y="140" width="220" height="140" rx="18" fill="#a16207" stroke="#854d0e" stroke-width="6"/>
     <rect x="90" y="186" width="220" height="16" fill="#78350f" opacity="0.6"/>
     <rect x="238" y="192" width="62" height="44" rx="10" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
     <circle cx="269" cy="214" r="10" fill="#78350f"/>`,
  ),
  // メガネ
  "lost-glasses": wrap(
    "#1e293b",
    `<circle cx="132" cy="210" r="52" fill="none" stroke="#94a3b8" stroke-width="10"/>
     <circle cx="268" cy="210" r="52" fill="none" stroke="#94a3b8" stroke-width="10"/>
     <path d="M184 208 q16 -14 32 0" fill="none" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/>
     <path d="M80 200 q-24 -14 -34 -34" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round"/>
     <path d="M320 200 q24 -14 34 -34" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round"/>`,
  ),
  // 上着
  "lost-jacket": wrap(
    "#1e293b",
    `<path d="M150 100 L110 130 L92 210 L128 224 L128 320 L272 320 L272 224 L308 210 L290 130 L250 100 L200 128 Z"
           fill="#475569" stroke="#64748b" stroke-width="6" stroke-linejoin="round"/>
     <path d="M200 128 L200 320" stroke="#94a3b8" stroke-width="5" stroke-dasharray="12 10"/>
     <path d="M150 100 L200 128 L250 100" fill="none" stroke="#94a3b8" stroke-width="5"/>`,
  ),
  // 鍵
  "lost-key": wrap(
    "#1e293b",
    `<circle cx="150" cy="200" r="52" fill="none" stroke="#fbbf24" stroke-width="18"/>
     <rect x="196" y="188" width="140" height="24" rx="8" fill="#fbbf24"/>
     <rect x="286" y="212" width="20" height="34" rx="6" fill="#fbbf24"/>
     <rect x="246" y="212" width="20" height="26" rx="6" fill="#fbbf24"/>`,
  ),
};

mkdirSync(OUT_DIR, { recursive: true });
let n = 0;
for (const [name, svg] of Object.entries(items)) {
  writeFileSync(join(OUT_DIR, `${name}.svg`), svg);
  n++;
}
console.log(`ダミー写真 ${n}枚 → public/dummy/`);
