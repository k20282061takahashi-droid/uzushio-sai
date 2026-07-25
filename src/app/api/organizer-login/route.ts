import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (
    typeof password !== "string" ||
    !process.env.ORGANIZER_PASSWORD ||
    password !== process.env.ORGANIZER_PASSWORD
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("organizer_session", process.env.ORGANIZER_SESSION_SECRET ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return response;
}
