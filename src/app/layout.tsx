import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Zen_Maru_Gothic,
  Noto_Sans_JP,
  Zen_Kaku_Gothic_Antique,
  Dela_Gothic_One,
} from "next/font/google";
import "./globals.css";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 見出し・ロゴ・強調用（デザイン仕様書 3章）
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  weight: ["500", "700", "900"],
  subsets: ["latin"],
});

// 本文用（デザイン仕様書 3章）
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

// 運営ダッシュボード用（モノクロ・線細めのUIに合わせた角ゴシック）
const zenKakuGothicAntique = Zen_Kaku_Gothic_Antique({
  variable: "--font-zen-kaku-antique",
  // 900 は企画担当者画面の見出し・ボタン用（極太だが文字は潰れない）
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
});

// 企画担当者画面の「数字」だけに使う極太フォント。
// 文章に使うと潰れるので、待ちグループ数・時刻などの数字専用。
const delaGothicOne = Dela_Gothic_One({
  variable: "--font-dela-gothic",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "渦潮祭",
  description: "渦潮祭 来場者用アプリ",
  // 「ホーム画面に追加」したときに、ブラウザのバーを出さず全画面で開くための設定。
  // どの機種でも、上下のバーが消えるぶん（100px前後）画面が広くなる。
  appleWebApp: {
    capable: true,
    title: "渦潮祭",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#DCF0F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${zenMaruGothic.variable} ${notoSansJP.variable} ${zenKakuGothicAntique.variable} ${delaGothicOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-kosei-50 font-body">
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
