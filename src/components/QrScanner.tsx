"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// カメラを起動してQRコードを読み取る部品。
// 読み取れたら onDetected に中身の文字列を渡す。
export default function QrScanner({
  onDetected,
}: {
  onDetected: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  // 同じQRを何度も読み取らないようにするための控え
  const lastText = useRef<string>("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // 背面カメラを優先する
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        tick();
      } catch {
        setError(
          "カメラを使えませんでした。ブラウザの設定でカメラを許可してください。",
        );
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const image = ctx.getImageData(0, 0, width, height);
          const found = jsQR(image.data, width, height, {
            inversionAttempts: "dontInvert",
          });
          if (found?.data && found.data !== lastText.current) {
            lastText.current = found.data;
            onDetected(found.data);
          }
        }
      }
      frame = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  if (error) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-danger-800 bg-danger-50 p-4 text-sm font-bold text-danger-800">
        {error}
      </div>
    );
  }

  return (
    <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-3xl border-2 border-kosei-700 bg-black shadow-[0_5px_0_var(--color-kosei-700)]">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* 読み取り位置の目安になる枠 */}
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
      <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/80">
        QRコードを枠の中に入れてください
      </p>
    </div>
  );
}
