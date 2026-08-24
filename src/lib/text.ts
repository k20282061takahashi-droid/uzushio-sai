// 文字を「…」で省略するための共通処理。

// あと1〜2文字で収まるのに「…」で隠すのは、かえって読みにくく不自然。
// はみ出しがこの文字数以下なら、省略せずそのまま全部表示する。
const ALLOWANCE = 3;

export function truncate(text: string, max: number): string {
  if (!text) return "";
  // 少しはみ出しただけならそのまま出す
  if (text.length <= max + ALLOWANCE) return text;

  // 「…」の直前が句読点や空白だと不格好なので、その分を削ってから付ける
  let cut = text.slice(0, max);
  cut = cut.replace(/[\s、。,.・:：;；\-–—]+$/u, "");

  // 削りすぎて短くなりすぎた場合は元の位置まで戻す
  if (cut.length < max - ALLOWANCE) cut = text.slice(0, max);

  return `${cut}…`;
}
