export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // organizer-ui は globals.css で定義しているクラス。
  // 運営画面だけをモノクロ・線細め・角ゴシック（Zen Kaku Gothic Antique）にする。
  return (
    <div className="organizer-ui min-h-screen bg-neutral-950 text-neutral-100">
      {children}
    </div>
  );
}
