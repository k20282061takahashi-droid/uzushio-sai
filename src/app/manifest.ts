import type { MetadataRoute } from "next";

// ホーム画面に追加したときの設定（PWA = Progressive Web App）。
//
// なぜ必要か
// ----------
// スマホのブラウザ（とくにiPhoneのSafari）は、画面の上下にアドレスバーと
// ツールバーを常に出している。iPhone SEのような小さい端末だと、これだけで
// 画面の高さの2割近くが消え、地図が狭くなるうえ、アプリ下部のタブが
// ブラウザのボタンのすぐ上に来て押し間違えやすい。
//
// この設定ファイルがあると「ホーム画面に追加」したときにブラウザのバーが
// 消えて、ふつうのアプリと同じ全画面で開けるようになる。
//
// ※ アイコンは仮のもの（渦のマーク）。本採用のロゴが決まったら
//   public/icons/ の画像と src/app/apple-icon.png を差し替える。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "渦潮祭",
    short_name: "渦潮祭",
    description: "渦潮祭 来場者用アプリ",
    start_url: "/",
    // ブラウザのバーを出さずに全画面で開く
    display: "standalone",
    // 縦固定にはしない。高校棟のような横長の図面は、
    // 横向きにしたほうが大きく見えるため。
    background_color: "#DCF0F5",
    theme_color: "#DCF0F5",
    lang: "ja",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
