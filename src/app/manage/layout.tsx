export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // manage-ui は globals.css で定義しているクラス。
  // 企画担当者画面だけを「黒地＋ビビッドカラー＋極太フォント」にする。
  return (
    <div className="manage-ui min-h-screen bg-bbb-ink text-white">
      {children}
    </div>
  );
}
