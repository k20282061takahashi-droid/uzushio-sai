"use client";

import { useEffect, useRef, useState } from "react";

// 要素の実際の高さ（px）をはかって返す。
//
// なぜ必要か
// ----------
// 「下のタブは69px」「上のボタンは104px」のように高さを数字で決め打ちすると、
// 文字の大きさ設定・端末の幅・safe area（iPhoneのホームバーの余白）の違いで
// すぐズレる。機種ごとに数字を用意するのは現実的ではないので、
// 実際に表示された高さをはかって、それを他の場所から使えるようにする。
//
// 返り値の ref を、はかりたい要素に付ける。
export function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ResizeObserver は監視を始めた時点で1回呼ばれるので、初回もここで決まる。
    // 画面の回転・文字サイズ変更・safe areaの変化でも呼び直される。
    const ro = new ResizeObserver(() => {
      setHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, height };
}
