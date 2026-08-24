import BottomNav from "@/components/BottomNav";
import VisitRecorder from "@/components/VisitRecorder";

export default function VisitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      {/* 来場者がアプリを開いたことを記録する（人数集計用・画面には出ない） */}
      <VisitRecorder />
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
