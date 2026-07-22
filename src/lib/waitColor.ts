// 待ち時間(分)を 緑→黄→赤 のグラデーションカラーに変換する
// 0分=緑(hue120)、15分=黄(hue50)、30分以上=赤(hue0)
export function waitColor(minutes: number): string {
  const clamped = Math.max(0, Math.min(30, minutes));
  const t = clamped / 30;
  const hue = t <= 0.5 ? 120 - (120 - 50) * (t / 0.5) : 50 - 50 * ((t - 0.5) / 0.5);
  return `hsl(${hue}, 72%, 45%)`;
}
