export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // manage-ui は globals.css で定義しているクラス。
  // 企画担当者画面だけを「白いカード＋寒色グレーの背景＋角ゴシック」にする。
  return (
    <div className="manage-ui min-h-screen bg-mist-50 text-neutral-900">
      {children}
    </div>
  );
}
