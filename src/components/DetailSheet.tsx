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
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[28px] border-2 border-b-0 border-kosei-700 bg-white p-5 transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-kosei-200" />
        {children}
      </div>
    </div>
  );
}
