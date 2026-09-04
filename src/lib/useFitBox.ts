"use client";

import { useEffect, useRef, useState } from "react";

// 枠の中に、図の縦横比を保ったまま最大の大きさで収まる箱の大きさを返す。
//
// なぜCSSだけでやらないか
// ------------------------
// `width:100%` と `aspect-ratio` と `max-height:100%` を組み合わせると、
// 高さが足りないときに max-height だけが効いて幅はそのまま残るため、
// 箱が縦につぶれる。中の図はその歪んだ箱に引き伸ばされる一方、
// ピンの位置は「図の何％」で置いているのでズレてしまう。
// （体育館だけ縦長なので、横長の画面＝パソコンでこれが起きていた）
//
// そこで枠の実寸をはかって、収まる大きさを自分で計算している。
export function useFitBox(ratio: number | null) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !ratio) return;
    // ResizeObserver は監視を始めた時点で1回呼ばれるので、初回もここで決まる
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const width = Math.min(r.width, r.height * ratio);
      setSize({ width, height: width / ratio });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  return { frameRef, size };
}
