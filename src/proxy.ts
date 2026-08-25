import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 特別企画スタッフ用ページ（/reward）は専用のログインで守る
  const isReward = pathname.startsWith("/reward");
  const loginPath = isReward ? "/reward/login" : "/organizer/login";
  const cookieName = isReward ? "reward_session" : "organizer_session";

  if (pathname === loginPath) {
    return NextResponse.next();
  }

  const session = request.cookies.get(cookieName)?.value;
  if (session && session === process.env.ORGANIZER_SESSION_SECRET) {
    return NextResponse.next();
  }

  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/organizer/:path*", "/reward/:path*"],
};
