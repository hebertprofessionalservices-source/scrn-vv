import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, COOKIE_NAME, verifyToken } from "@/lib/auth";

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

  // Admin scope check for /admin/*
  if (pathname.startsWith("/admin")) {
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const adminDecoded = adminToken ? await verifyToken(adminToken, secret) : null;
    if (!adminDecoded || adminDecoded.scope !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/unlock";
      url.searchParams.set("admin", "1");
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();
  res.headers.set("x-next-pathname", pathname);
  return res;
}
