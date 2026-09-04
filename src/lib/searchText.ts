// 検索のための文字ならし。
//
// 来場者は「2年A組」を「２年Ａ組」「二年A組」「2-A」など、いろいろな
// 書き方で探す。カタカナとひらがなも混ざる（「タコヤキ」「たこやき」）。
// そのままの文字くらべでは当たらないので、探す側と探される側の両方を
// 同じ形にそろえてから比べる。

const KANJI_DIGITS: Record<string, string> = {
  〇: "0",
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
  十: "10",
};

// 基本のならし
//  ・全角の英数字を半角に（NFKCが「２」→「2」「Ａ」→「A」をやってくれる）
//  ・漢数字を数字に（「二年」→「2年」）
//  ・カタカナをひらがなに（「タコヤキ」→「たこやき」）
//  ・大文字を小文字に
//  ・空白と区切り記号を落とす
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[〇一二三四五六七八九十]/g, (c) => KANJI_DIGITS[c] ?? c)
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase()
    .replace(/[\s・･,，.．\-ー―−_/／]/g, "");
}

// さらに「年」「組」も落とした形。
// 「2-A」と「2年A組」を同じ「2a」にそろえて、どちらで探しても当たるようにする。
export function compactForSearch(text: string): string {
  return normalizeForSearch(text).replace(/[年組]/g, "");
}

// 探している言葉が、対象の文字のどこかに含まれているか。
// ならした形と、さらに縮めた形の両方でくらべる。
export function matchesSearch(haystack: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  if (normalizeForSearch(haystack).includes(q)) return true;
  const qc = compactForSearch(query);
  return qc.length > 0 && compactForSearch(haystack).includes(qc);
}
