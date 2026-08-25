// 来場者アプリ全体に敷く背景。
// SplashScreenで使っている渦の線パスを流用し、湖青の薄い段階で
// 全面にゆっくり（46秒/周）回転させ続ける。
// 「流れ続けているような」渦潮モチーフの雰囲気案（v2）をそのままコンポーネント化したもの。
export default function SwirlBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 12% -10%, #bfe9f3 0%, transparent 55%), " +
          "radial-gradient(130% 100% at 100% 110%, #9bdcec 0%, transparent 60%), " +
          "linear-gradient(180deg, #eaf8fb 0%, #d3eef6 55%, #bfe6f0 100%)",
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-[46%] h-[260%] w-[260%] -translate-x-1/2 -translate-y-1/2 animate-swirl-rotate"
      >
        <defs>
          <linearGradient id="swirlBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2B93B0" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#4FB8D2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#78CCE0" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path
          d="M100 12 A 88 88 0 1 1 12 100 A 72 72 0 1 0 100 28 A 56 56 0 1 1 156 100 A 40 40 0 1 0 100 60 A 24 24 0 1 1 124 100"
          fill="none"
          stroke="url(#swirlBg)"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path
          d="M100 12 A 88 88 0 1 1 12 100 A 72 72 0 1 0 100 28 A 56 56 0 1 1 156 100 A 40 40 0 1 0 100 60 A 24 24 0 1 1 124 100"
          fill="none"
          stroke="url(#swirlBg)"
          strokeWidth={4.5}
          strokeLinecap="round"
          opacity={0.7}
          transform="rotate(40 100 100)"
        />
      </svg>
    </div>
  );
}
