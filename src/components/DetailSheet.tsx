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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl border-t border-white/15 bg-zinc-950 p-5 transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        {children}
      </div>
    </div>
  );
}
