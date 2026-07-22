import RadialMenu from "@/components/RadialMenu";

export default function VisitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="flex-1 pb-8">{children}</div>
      <RadialMenu />
    </div>
  );
}
