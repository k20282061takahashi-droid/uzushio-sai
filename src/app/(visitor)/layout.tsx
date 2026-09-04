import OpeningScreen from "@/components/OpeningScreen";
import SwirlBackground from "@/components/SwirlBackground";
import VisitorShell from "@/components/VisitorShell";

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
      {/* 文化祭が始まる前は、中身のかわりに「あと○日」を出す（VisitorShell が判断する）。
          下のタブ・来場者数の記録・ホーム画面追加の案内も、その中で切り替わる。 */}
      <VisitorShell>{children}</VisitorShell>
    </div>
  );
}
