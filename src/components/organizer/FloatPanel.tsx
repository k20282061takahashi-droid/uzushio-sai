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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[94vh] w-full ${widthClass} flex-col overflow-hidden rounded-xl border border-white/12 bg-neutral-900/95 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] sm:max-h-[88vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-3.5 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-lg font-medium tracking-[0.02em]">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-white/35 hover:text-white active:scale-95"
          >
            閉じる
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
