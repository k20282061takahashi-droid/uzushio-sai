"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/visits";

// 来場者アプリを開いたことを記録する、画面に何も表示しない部品。
// (visitor)/layout.tsx に置いてあるので、来場者向けページでだけ動く。
// 運営用・企画担当者用のページでは動かないため、人数に混ざらない。
export default function VisitRecorder() {
  useEffect(() => {
    recordVisit();
  }, []);

  return null;
}
