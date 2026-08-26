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
      {/* 大きい渦：右上寄り、画面の中をゆっくり大きく動き続ける。
          線がくっきりしすぎないよう、ぼかしをかけて柔らかい印象にする。 */}
      <div
        className="absolute -right-24 -top-20 opacity-45 blur-[6px] animate-swirl-drift-a"
      >
        <WhirlpoolAnimation size={480} />
      </div>

      {/* 小さい渦：左下寄り、大きい渦とは逆向き・別の速さでゆっくり動く */}
      <div
        className="absolute -bottom-16 -left-16 opacity-35 blur-[4px] animate-swirl-drift-b"
      >
        <WhirlpoolAnimation size={260} />
      </div>
    </div>
  );
}
