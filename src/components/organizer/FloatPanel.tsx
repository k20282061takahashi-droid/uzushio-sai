"use client";

import { useEffect } from "react";

// 画面の中央に大きく開く共通のフロート画面。
// 運営画面はiPad/Macで使うので、横幅を広く取って一度に多くを見られるようにしている。
//
// 背景をクリックするか、Escキーで閉じる。
export default function FloatPanel({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "wide",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "wide" | "medium" | "narrow";
}) {
  // Escキーで閉じられるようにする
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    width === "wide"
      ? "max-w-6xl"
      : width === "medium"
        ? "max-w-3xl"
        : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[88vh] w-full ${widthClass} flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-slate-300 active:scale-95"
          >
            閉じる
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-white/10 px-6 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
