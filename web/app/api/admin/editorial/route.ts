import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const secret = process.env.COOKIE_SECRET;
  const repo = process.env.GITHUB_REPO;
  const pat = process.env.GITHUB_PAT;
  if (!secret || !repo || !pat) return new NextResponse("Server misconfigured", { status: 500 });

  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const decoded = adminToken ? await verifyToken(adminToken, secret) : null;
  if (!decoded || decoded.scope !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const form = await req.formData();
  const editorial = {
    currentSeason: process.env.NEXT_PUBLIC_SEASON ?? "2025-26",
    currentWeek: Number(form.get("currentWeek") ?? 0),
    gameOfTheWeek: {
      gameId: String(form.get("gameOfTheWeekId") ?? "") || null,
      storyline: String(form.get("storyline") ?? ""),
      pickedBy: String(form.get("pickedBy") ?? ""),
      pickedAt: new Date().toISOString(),
    },
    topPerformerNotes: {},
    featuredQuote: String(form.get("featuredQuote") ?? ""),
  };

  const path = "web/public/data/editorial.json";
  const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" },
  });
  const existing = getRes.ok ? await getRes.json() as { sha?: string } : null;
  const sha = existing?.sha;

  const content = Buffer.from(JSON.stringify(editorial, null, 2), "utf-8").toString("base64");
  const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({
      message: "editorial: update from /admin/editorial",
      content,
      sha,
      branch: "main",
    }),
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    return new NextResponse(`GitHub commit failed: ${body}`, { status: 502 });
  }

  return NextResponse.redirect(new URL("/admin/editorial?ok=1", req.nextUrl), 303);
}
