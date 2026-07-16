import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/unlock", "/api/unlock", "/_next", "/brand", "/favicon.ico"];

export const config = { matcher: "/((?!api/admin/editorial).*)" };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set("x-next-pathname", pathname);
    return res;
  }
  // Site-wide password gate temporarily disabled (2026-07). To restore,
  // re-add the site cookie check here — see git history for the original.

  // Admin scope check for /admin/*
  if (pathname.startsWith("/admin")) {
    const secret = process.env.COOKIE_SECRET;
    if (!secret) {
      return new NextResponse("Server misconfiguration", { status: 500 });
    }
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
