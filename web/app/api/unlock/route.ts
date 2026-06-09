import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, signToken } from "@/lib/auth";

// In-memory throttle (one process = one Vercel function instance).
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.resetAt > now && rec.count >= 3) {
    return new NextResponse("Too many attempts, try again in 60s.", { status: 429 });
  }

  const expected = process.env.SITE_PASSWORD;
  const secret = process.env.COOKIE_SECRET;
  if (!expected || !secret) return new NextResponse("Server misconfigured.", { status: 500 });

  if (password !== expected) {
    const nextRec = rec && rec.resetAt > now ? rec : { count: 0, resetAt: now + 60_000 };
    nextRec.count += 1;
    attempts.set(ip, nextRec);
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", next);
    url.searchParams.set("err", "1");
    return NextResponse.redirect(url, 303);
  }

  attempts.delete(ip);
  const token = await signToken({ scope: "site" }, secret);
  const url = req.nextUrl.clone();
  url.pathname = next.startsWith("/") ? next : "/";
  url.search = "";
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
