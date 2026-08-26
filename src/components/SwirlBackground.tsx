import WhirlpoolAnimation from "./WhirlpoolAnimation";

// 来場者アプリ全体に敷く背景。
// 大小2つの渦潮アニメーション（WhirlpoolAnimation）を薄く重ね、
// それぞれがゆっくり位置を漂うように動かし続ける。
export default function SwirlBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 12% -10%, #bfe9f3 0%, transparent 55%), " +
          "radial-gradient(130% 100% at 100% 110%, #9bdcec 0%, transparent 60%), " +
          "linear-gradient(180deg, #eaf8fb 0%, #d3eef6 55%, #bfe6f0 100%)",
      }}
    >
      {/* 大きい渦：右上寄り、ゆっくり右下へ漂ってから戻る */}
      <div className="absolute -right-24 -top-20 opacity-45 animate-swirl-drift-a">
        <WhirlpoolAnimation size={480} />
      </div>

      {/* 小さい渦：左下寄り、逆向きにゆっくり漂う */}
      <div className="absolute -bottom-16 -left-16 opacity-35 animate-swirl-drift-b">
        <WhirlpoolAnimation size={260} />
      </div>
    </div>
  );
}
