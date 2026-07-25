import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/organizer/login") {
    return NextResponse.next();
  }

  const session = request.cookies.get("organizer_session")?.value;
  if (session && session === process.env.ORGANIZER_SESSION_SECRET) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/organizer/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/organizer/:path*"],
};
