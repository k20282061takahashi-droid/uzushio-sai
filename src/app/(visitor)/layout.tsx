import BottomNav from "@/components/BottomNav";
import VisitRecorder from "@/components/VisitRecorder";
import OpeningScreen from "@/components/OpeningScreen";
import SwirlBackground from "@/components/SwirlBackground";
import AddToHomeHint from "@/components/AddToHomeHint";

export default function VisitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 高さは 100vh ではなく 100dvh。
    // 100vh は「ブラウザのバーが引っ込んだときの高さ」なので、バーが出ている
    // 間はページが画面より必ず高くなり、少し触っただけで縦スクロールが起きて
    // バーが出たり引っ込んだりして画面がガタつく。
    // 100dvh は「いま実際に見えている高さ」なので、機種によらずこれが起きない。
    <div className="relative flex min-h-[100dvh] flex-col text-kosei-800">
      {/* 全画面共通の背景。ゆっくり回り続ける渦潮モチーフ */}
      <SwirlBackground />
      {/* アプリを開いた最初に出るオープニング演出。この間に本体が読み込まれる */}
      <OpeningScreen />
      {/* 来場者がアプリを開いたことを記録する（人数集計用・画面には出ない） */}
      <VisitRecorder />
      {/* 下のタブに隠れないための余白。--nav-h はタブが自分の高さをはかって
          入れてくれるので、機種や文字サイズ設定が変わっても自動で合う。 */}
      <div
        className="relative z-10 flex-1"
        style={{ paddingBottom: "var(--nav-h)" }}
      >
        {children}
      </div>
      {/* iPhoneのブラウザで開いている人にだけ、1度だけ出す案内 */}
      <AddToHomeHint />
      <div className="relative z-10">
        <BottomNav />
      </div>
    </div>
  );
}
