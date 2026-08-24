"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logEvent } from "firebase/analytics";
import { initAnalytics } from "@/lib/firebase";

// 利用者数を計測するための、画面に何も表示しない部品。
// app/layout.tsx に置いてあり、全ページで動く。
//
// ・端末（ブラウザ）ごとにIDが発行され、それを元に人数が数えられる
//   → 同じ端末で開き直しても「1人」としてカウントされる
// ・個人を特定する情報（名前・メールなど）は一切送っていない
//
// 集計結果は Firebase コンソールの「Analytics」から確認できる。
export default function AnalyticsTracker() {
  const pathname = usePathname();
  // 最初の1回はFirebase側が自動で記録するので、二重に数えないよう飛ばす
  const isFirstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;

    initAnalytics().then((analytics) => {
      if (!analytics || cancelled) return;

      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      // ページを移動したとき（アプリ内での画面切り替え）を記録する
      logEvent(analytics, "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
