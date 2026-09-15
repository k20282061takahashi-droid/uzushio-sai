"use client";

import type { ReactNode } from "react";

// 運営ダッシュボードの見た目の共通部品。
//
// ここに「カードの枠」「大きな数字」「小さな棒グラフ」をまとめてある。
// 同じ見た目を各所で書き写すと、あとで角丸を1つ変えるだけで全部を直して回る
// ことになるため、使い回す形にしている。
//
// 色のきまり
//   ・面（背景）は黒〜濃いグレー。ターコイズで塗りつぶさない（目が疲れるため）
//   ・ターコイズは「いま見るべきところ」だけ。文字・線・小さな印に使う
//   ・赤／黄／緑は意味のある色。緊急・注意・正常のときだけ

export type Tone = "normal" | "accent" | "alert" | "warn";

const toneRing: Record<Tone, string> = {
  normal: "border-white/10",
  accent: "border-org-700",
  alert: "border-danger-800/70",
  warn: "border-warn-800/60",
};

// カードの左上に置く、ぼんやりした光。輪郭が出ないよう薄くしている。
// 真っ黒な面が並ぶと平べったく見えるので、光で奥行きを作っている。
const toneGlow: Record<Tone, string> = {
  normal: "",
  accent: "glow-soft",
  alert: "glow-alert",
  warn: "glow-soft",
};

// カードの枠。見出しと、右上に置くボタンを受け取れる。
export function Card({
  title,
  badge,
  tone = "normal",
  action,
  onClick,
  className = "",
  bodyClassName = "",
  children,
}: {
  title?: string;
  /** 見出しの右に出す小さな文字（件数など） */
  badge?: string;
  tone?: Tone;
  /** 見出しの右端に置くボタン */
  action?: ReactNode;
  /** カード全体を押せるようにする */
  onClick?: () => void;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  const clickable = onClick != null;
  return (
    <section
      onClick={onClick}
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-neutral-950/72 backdrop-blur-[2px] ${
        toneRing[tone]
      } ${toneGlow[tone]} ${
        clickable ? "cursor-pointer transition-colors hover:bg-neutral-900/72" : ""
      } ${className}`}
    >
      {(title || action) && (
        <header className="flex shrink-0 items-center gap-2 px-4 pt-3.5 pb-2">
          {title && (
            <h2 className="text-[13px] font-medium tracking-[0.04em] text-neutral-200">
              {title}
            </h2>
          )}
          {badge && (
            <span
              className={`rounded-full px-2 py-[1px] text-[12px] font-medium ${
                tone === "alert"
                  ? "bg-danger-800/25 text-danger-600"
                  : tone === "warn"
                    ? "bg-warn-800/25 text-warn-600"
                    : "bg-white/[0.07] text-neutral-400"
              }`}
            >
              {badge}
            </span>
          )}
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 px-4 pb-3.5 ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}

// 大きな数字のカード。本部の机から離れて見ても読める大きさにしている。
export function StatCard({
  label,
  value,
  unit,
  sub,
  tone = "normal",
  action,
  children,
  onClick,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  /** 数字の下に出す短い説明 */
  sub?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  /** 数字の下に置くグラフなど */
  children?: ReactNode;
  onClick?: () => void;
}) {
  const valueColor =
    tone === "alert"
      ? "text-danger-600"
      : tone === "accent"
        ? "text-org-500"
        : "text-neutral-100";
  return (
    <Card tone={tone} onClick={onClick} className="justify-between">
      <div className="flex items-start justify-between gap-2 pt-1">
        <p className="text-[13px] tracking-[0.06em] text-neutral-400">{label}</p>
        {action}
      </div>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-[2.6rem] font-medium leading-none tabular-nums ${valueColor}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[13px] text-neutral-500">{unit}</span>
        )}
      </p>
      {sub && <div className="mt-1.5 text-[13px] text-neutral-400">{sub}</div>}
      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
}

// 小さな棒グラフ。数字だけでは分からない「増え方」を見せる。
//
// 値の大きさは、いちばん高い棒を基準にした割合で描く。
// 目盛りは出さない（細かい値を読む場所ではなく、形を見る場所なので）。
export function SparkBars({
  values,
  highlightLast = true,
  height = 44,
}: {
  values: number[];
  /** 最後の1本だけアクセント色にする（いまの時間帯を示す） */
  highlightLast?: boolean;
  height?: number;
}) {
  if (values.length === 0) {
    return (
      <p className="text-[13px] text-neutral-600">まだ記録がありません</p>
    );
  }
  const max = Math.max(...values, 1);
  return (
    <div
      className="flex items-end gap-[3px]"
      style={{ height }}
      aria-hidden
    >
      {values.map((v, i) => {
        const last = highlightLast && i === values.length - 1;
        return (
          <span
            key={i}
            className={`flex-1 rounded-sm ${
              last ? "bg-org-500" : "bg-white/20"
            }`}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

// 一覧の1行。アイコンの代わりに小さな点で状態を示す。
export function Row({
  dot,
  title,
  sub,
  right,
  onClick,
}: {
  /** 左端の小さな点の色（Tailwindのクラス） */
  dot?: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 border-b border-white/[0.06] py-2 last:border-b-0 ${
        onClick ? "cursor-pointer hover:bg-white/[0.03]" : ""
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-neutral-100">{title}</p>
        {sub && (
          <p className="truncate text-[12px] text-neutral-500">{sub}</p>
        )}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </div>
  );
}
