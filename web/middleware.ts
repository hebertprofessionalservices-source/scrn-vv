import { NextRequest, NextResponse } from "next/server";

// Skip static assets: middleware on every logo and chunk only adds edge
// invocations. /data stays matched so the block below can refuse it.
export const config = {
  matcher: "/((?!_next/static|_next/image|team-logos|brand|favicon.ico).*)",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The scraped JSON lives in public/ so server code can read it from disk,
  // but nothing in the browser fetches it. Serving it publicly let
  // anyone (or any crawler) pull 40 MB+ files straight off the CDN.
  if (pathname.startsWith("/data/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  // The root layout reads this to decide when to drop the site chrome. It
  // must ride on the request: a response header only reaches headers() on
  // some hosts, and on Netlify it never does.
  const headers = new Headers(req.headers);
  headers.set("x-next-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}
