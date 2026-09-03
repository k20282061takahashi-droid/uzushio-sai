// 校内図のダークテーマ用SVGを作る。
//
// 運営画面は背景が黒に近いので、黒い線で描かれた図面をそのまま置くと
// 背景と同化して見えない。線と記号だけを明るい色に差し替えた複製を
// public/floorplans/dark/ に作る。トイレや階段の塗り色はそのまま残す。
//
// 使い方:  node scripts/make-dark-floorplans.mjs
// 図面（public/floorplans/*.svg）を差し替えたら、これを実行し直すこと。

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "public/floorplans";
const OUT = join(SRC, "dark");

// 置き換える色。左が元の色、右がダークテーマ用の色。
const SWAPS = [
  [/stroke="black"/g, 'stroke="#C3CDD8"'],       // 壁・仕切りの線
  [/stroke="#000000"/gi, 'stroke="#C3CDD8"'],
  [/fill="#1F1F1F"/gi, 'fill="#C3CDD8"'],        // 階段・EVなどの記号
  [/stroke="#101010"/gi, 'stroke="#C3CDD8"'],    // 体育館の線
  [/fill="#101010"/gi, 'fill="#C3CDD8"'],        // 体育館の「高校棟」の文字
  [/fill="white"/gi, 'fill="#1A2430"'],          // 記号の下地
  [/fill="#FFFFFF"/gi, 'fill="#1A2430"'],
];

mkdirSync(OUT, { recursive: true });

let n = 0;
for (const name of readdirSync(SRC)) {
  if (!name.endsWith(".svg")) continue;
  let svg = readFileSync(join(SRC, name), "utf8");
  for (const [from, to] of SWAPS) svg = svg.replace(from, to);
  writeFileSync(join(OUT, name), svg);
  n++;
}
console.log(`ダーク版を ${n} 枚つくりました → ${OUT}`);
