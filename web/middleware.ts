import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/unlock", "/api/unlock", "/_next", "/brand", "/favicon.ico"];

export const config = { matcher: "/((?!api/admin/editorial).*)" };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set("x-next-pathname", pathname);
    return res;
  }
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    return new NextResponse("Server misconfiguration", { status: 500 });
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const decoded = token ? await verifyToken(token, secret) : null;
  if (!decoded) {
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("x-next-pathname", pathname);
  return res;
}
