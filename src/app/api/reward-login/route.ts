import { NextResponse } from "next/server";

// 特別企画スタッフ用ページのログイン。
// 専用のパスワード（REWARD_STAFF_PASSWORD）を設定できる。
// 未設定の場合は運営用パスワードで入れるようにしてある。
export async function POST(request: Request) {
  const { password } = await request.json();
  const expected =
    process.env.REWARD_STAFF_PASSWORD || process.env.ORGANIZER_PASSWORD;

  if (typeof password !== "string" || !expected || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    "reward_session",
    process.env.ORGANIZER_SESSION_SECRET ?? "",
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // 当日ずっと開きっぱなしにできるよう長めにしてある
      maxAge: 60 * 60 * 24,
      path: "/",
    },
  );
  return response;
}
