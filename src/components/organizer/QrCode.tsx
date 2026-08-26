"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// 企画担当者用URLのQRコードを表示し、画像としてコピー・保存できるようにする部品。
// 紙で配るときにURLを打ち間違えられないようにするためのもの。
export default function QrCode({
  value,
  label,
  size = 160,
}: {
  value: string;
  label?: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => {
      // 生成に失敗しても画面は壊さない
    });
  }, [value, size]);

  // QRコードを画像としてクリップボードにコピーする
  async function copyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("画像を作れませんでした");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2000);
  }

  // 画像として保存する（印刷して配る用）
  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${label || "qr"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        className="rounded-lg bg-white p-1"
        style={{ width: size, height: size }}
      />
      <div className="flex gap-1">
        <button
          onClick={copyImage}
          className="rounded-md bg-neutral-900/75 px-3 py-1.5 text-[13px] text-neutral-200 active:scale-95"
        >
          {copied === "done"
            ? "コピーしました"
            : copied === "failed"
              ? "コピーできません"
              : "画像をコピー"}
        </button>
        <button
          onClick={download}
          className="rounded-md bg-neutral-900/75 px-3 py-1.5 text-[13px] text-neutral-200 active:scale-95"
        >
          保存
        </button>
      </div>
    </div>
  );
}
