// アプリ全体で使うアイコン。絵文字は端末ごとに見た目が変わるので、
// 線画（SVG）で統一している。色は文字色をそのまま引き継ぐ（currentColor）。
//
// 使い方: <PinIcon className="h-4 w-4 text-accent-700" />

type Props = { className?: string };

function Svg({
  className = "h-5 w-5",
  children,
  filled = false,
}: Props & { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

// ピン留め
export function PinIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M9 3h6l-1 5 3.5 3.5H6.5L10 8z" />
      <line x1="12" y1="11.5" x2="12" y2="21" />
    </Svg>
  );
}

// スタンプ（獲得済みのしるし）
export function StampIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M9 3.8a3 3 0 0 1 6 0c0 1.6-1.3 2.6-1.3 4.2h-3.4C10.3 6.4 9 5.4 9 3.8z" />
      <rect x="5.5" y="12" width="13" height="3.4" rx="1.2" />
      <path d="M4.5 18.2h15" />
      <path d="M10.3 8h3.4l.8 4h-5z" />
    </Svg>
  );
}

// チェック
export function CheckIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M4.5 12.5l5 5 10-11" strokeWidth={2.4} />
    </Svg>
  );
}

// 丸の中のチェック（完了・使用済み）
export function CheckCircleIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.8 12.3l2.9 2.9 5.6-6.1" />
    </Svg>
  );
}

// 注意・警告
export function AlertIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M12 3.8L21 19.5H3z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// 不明・見つからない
export function QuestionIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.5" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// コンプリート（王冠）
export function CrownIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 7.5l3.8 3 4.7-6 4.7 6 3.8-3-1.8 10.2H5.3z" />
      <line x1="5.3" y1="20.2" x2="18.7" y2="20.2" />
    </Svg>
  );
}

// 地図上の場所
export function MapPinIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </Svg>
  );
}

// 閉じる（×）
export function CloseIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

// 挑戦券（チケット）
export function TicketIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 8.5V6.8c0-.7.6-1.3 1.3-1.3h14.4c.7 0 1.3.6 1.3 1.3v1.7a2.8 2.8 0 0 0 0 7v1.7c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3v-1.7a2.8 2.8 0 0 0 0-7z" />
      <line x1="14" y1="7.5" x2="14" y2="16.5" strokeDasharray="2 2.4" />
    </Svg>
  );
}
