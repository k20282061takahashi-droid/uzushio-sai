"use client";

export default function DetailSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-200 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-kosei-800/50" onClick={onClose} />
      {/* 中身が長いときはカードの中だけがスクロールする。
          画面の高さの85%までに収め、下端は下のメニューに隠れないよう余白をとる。 */}
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-[28px] border-2 border-b-0 border-kosei-700 bg-white transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-kosei-200" />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1"
          style={{
            paddingBottom:
              "calc(20px + 69px + max(env(safe-area-inset-bottom), 10px))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
