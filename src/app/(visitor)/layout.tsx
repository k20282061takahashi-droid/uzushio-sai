import BottomNav from "@/components/BottomNav";
import VisitRecorder from "@/components/VisitRecorder";
import SplashScreen from "@/components/SplashScreen";
import SwirlBackground from "@/components/SwirlBackground";

export default function VisitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col text-kosei-800">
      {/* 全画面共通の背景。ゆっくり回り続ける渦潮モチーフ */}
      <SwirlBackground />
      {/* アプリを開いた最初に出るオープニング演出。この間に本体が読み込まれる */}
      <SplashScreen />
      {/* 来場者がアプリを開いたことを記録する（人数集計用・画面には出ない） */}
      <VisitRecorder />
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
