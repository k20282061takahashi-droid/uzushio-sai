// 地図のピンの色と文字を決める。
//
// 以前は待ち時間を緑→黄→赤の連続したグラデーションにしていたが、
// 32分と38分の色の違いは人には読み取れず、色数が増えて地図が濁るだけだった。
// 実際に判断へ使うのは「すぐ入れる／少し待つ／混んでいる」の3段階なので、
// そこに絞っている。
//
// 色はアプリのパレット（湖青）から取り、空いているほど湖青、
// 混んでいるほど暖色になるようにした。赤と緑で表さない理由は2つある。
//   ・赤と緑の区別がつきにくい人がいる（青と赤橙なら誰でも区別できる）
//   ・空いている場所がアプリの色で埋まり、混んでいる場所だけが目立つ
// 文字は白なので、背景には濃い段階（600〜800）だけを使っている。

export const WAIT_SOME = 10; // これ以上で「少し待つ」
export const WAIT_BUSY = 25; // これ以上で「混んでいる」

export const PIN_COLORS = {
  soon: "#1F7690", // 湖青600  すぐ入れる
  some: "#C67F16", // 注意800  少し待つ
  busy: "#B33A30", // 警告800  混んでいる
  open: "#12495A", // 湖青800  待ち時間を出していない企画
  break: "#7A7A75", // 休憩中
  closed: "#9C9C97", // 終了
} as const;

// 凡例（地図の右上に出す色の説明）
export const PIN_LEGEND = [
  { color: PIN_COLORS.soon, label: "すぐ入れる" },
  { color: PIN_COLORS.some, label: `${WAIT_SOME}〜${WAIT_BUSY - 1}分まち` },
  { color: PIN_COLORS.busy, label: `${WAIT_BUSY}分以上まち` },
  { color: PIN_COLORS.open, label: "まちなし" },
  { color: PIN_COLORS.closed, label: "休憩中・終了" },
];

// 待ち時間(分)だけから色を出す（運営画面で使う）
export function waitColor(minutes: number): string {
  if (minutes >= WAIT_BUSY) return PIN_COLORS.busy;
  if (minutes >= WAIT_SOME) return PIN_COLORS.some;
  return PIN_COLORS.soon;
}

export type PinLook = {
  bg: string;
  /** ピンの中に出す短い文字 */
  text: string;
  /** 終了した企画は少し薄くする */
  faded: boolean;
};

// 企画の状態と待ち時間から、ピンの見た目をまとめて決める
export function pinLook(
  status: "open" | "break" | "closed",
  minutes: number | null,
): PinLook {
  if (status === "closed")
    return { bg: PIN_COLORS.closed, text: "終了", faded: true };
  if (status === "break")
    return { bg: PIN_COLORS.break, text: "休憩", faded: false };
  if (minutes === null)
    return { bg: PIN_COLORS.open, text: "開催", faded: false };
  if (minutes <= 0) return { bg: PIN_COLORS.soon, text: "すぐ", faded: false };
  return { bg: waitColor(minutes), text: `${minutes}分`, faded: false };
}
