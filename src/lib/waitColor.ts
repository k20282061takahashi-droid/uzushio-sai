// 混雑のぐあいを表す5段階と、地図のピンの色を決める。
//
// なぜ5段階にしたか
// ------------------
// もとは「待っている組数」と「1組あたりの時間」から待ち時間（分）を計算していた。
// けれど当日の担当者は接客をしながら入力するので、組数を数え続けるのは難しい。
// 見た感じで5つから1つ選ぶだけなら、忙しくても押せる。
//
// 色について（大事な注意）
// ------------------------
// 5段階を色だけで見分けるのは、人の目には無理がある。となりあう段階の色は
// どうしても似てしまう。そのため、ピンには色といっしょに短い言葉も出している。
// 色は「だいたいの目安」、正確な判断は言葉、という役割分担にしている。
//
// 赤と緑で表していないのは、その2色の区別がつきにくい人がいるため。
// 青 → 橙 → 赤 の並びなら、色の見え方に関わらず順番が分かる。

export type CrowdLevel = 1 | 2 | 3 | 4 | 5;

export type CrowdLevelInfo = {
  level: CrowdLevel;
  /** 企画担当者が選ぶときの言葉 */
  label: string;
  /** 地図のピンなど、せまい場所に出す短い言葉 */
  short: string;
  color: string;
};

export const CROWD_LEVELS: CrowdLevelInfo[] = [
  { level: 1, label: "すぐ入れる", short: "すぐ", color: "#1F7690" },
  { level: 2, label: "ちょっと混んでる", short: "少し混", color: "#2E8B8B" },
  { level: 3, label: "少し待つ", short: "少し待", color: "#C67F16" },
  { level: 4, label: "並ぶかも", short: "並ぶ", color: "#B85C1E" },
  { level: 5, label: "結構並ぶ", short: "混雑", color: "#B33A30" },
];

export const PIN_COLORS = {
  // 混雑のぐあいを出していない企画（対応していない／まだ入力がない）
  unknown: "#5A6472",
  break: "#7A7A75", // 休憩中
  closed: "#9C9C97", // 終了
} as const;

export function crowdInfo(level: CrowdLevel): CrowdLevelInfo {
  return CROWD_LEVELS[level - 1] ?? CROWD_LEVELS[0];
}

// 凡例（地図の右上に出す色の説明）
export const PIN_LEGEND = [
  ...CROWD_LEVELS.map((c) => ({ color: c.color, label: c.label })),
  { color: PIN_COLORS.unknown, label: "混雑の情報なし" },
  { color: PIN_COLORS.closed, label: "休憩中・終了" },
];

// 古いデータ（待ち時間の分数）を5段階に直す。
// 2026年より前のやり方で入力された企画を、そのまま表示できるようにするため。
export function minutesToCrowdLevel(minutes: number): CrowdLevel {
  if (minutes >= 30) return 5;
  if (minutes >= 20) return 4;
  if (minutes >= 10) return 3;
  if (minutes >= 3) return 2;
  return 1;
}

export type PinLook = {
  bg: string;
  /** ピンの中に出す短い文字 */
  text: string;
  /** 終了した企画は少し薄くする */
  faded: boolean;
};

// 企画の状態と混雑のぐあいから、ピンの見た目をまとめて決める。
//
// hasWaiting は「この企画が混雑のぐあいを出すかどうか」。
// 展示のように並ばない企画は false にしておく。
export function pinLook(
  status: "open" | "break" | "closed",
  level: CrowdLevel | null,
  hasWaiting: boolean,
): PinLook {
  if (status === "closed")
    return { bg: PIN_COLORS.closed, text: "終了", faded: true };
  if (status === "break")
    return { bg: PIN_COLORS.break, text: "休憩", faded: false };
  // 混雑のぐあいを出さない企画
  if (!hasWaiting)
    return { bg: PIN_COLORS.unknown, text: "開催", faded: false };
  // 出す企画だが、まだ一度も入力されていない
  if (level === null)
    return { bg: PIN_COLORS.unknown, text: "確認中", faded: false };
  const info = crowdInfo(level);
  return { bg: info.color, text: info.short, faded: false };
}
