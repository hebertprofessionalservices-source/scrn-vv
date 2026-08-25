"""Audit the 2026-27 dataset: team names, logos and schedules.

Read-only. Reports anything that would show up wrong on the site — a team with
no games, a logo file that doesn't exist, two teams sharing a URL slug, a name
with stray whitespace — grouped by how bad it is.

Usage:
    .venv/Scripts/python scripts/audit_dataset.py
    .venv/Scripts/python scripts/audit_dataset.py --season 2025-26
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper import slugify as slug_mod  # noqa: E402
from scraper.opponents import build_alias_map, school_slug  # noqa: E402

WEB = ROOT.parent / "web" / "public"
CONTEST_RE = re.compile(r"[?&](?:c|contestid)=([\w-]+)", re.I)

ERRORS: list[str] = []
WARNINGS: list[str] = []
NOTES: list[str] = []


def err(msg: str) -> None:
    ERRORS.append(msg)


def warn(msg: str) -> None:
    WARNINGS.append(msg)


def note(msg: str) -> None:
    NOTES.append(msg)


def contest_id(url: str | None) -> str | None:
    m = CONTEST_RE.search(url or "")
    return m.group(1) if m else None


def display_slug(team: dict) -> str:
    """Mirror web/lib/display-slug.ts — this is the team's public URL."""
    name = slug_mod.slugify(team["name"])
    mascot = slug_mod.slugify(team["mascot"]) if team.get("mascot") else ""
    if not mascot:
        return name
    return name if name.endswith(mascot) else f"{name}-{mascot}"


# ── names ─────────────────────────────────────────────────────────────────────
def audit_names(teams: list[dict]) -> None:
    print("\n=== TEAM NAMES ===")
    by_name: dict[str, list[str]] = collections.defaultdict(list)
    by_slug: dict[str, list[str]] = collections.defaultdict(list)
    by_id: dict[str, list[str]] = collections.defaultdict(list)
    whitespace = casing = nonascii = no_mascot = url_mismatch = 0

    for t in teams:
        name, mascot = t["name"], t.get("mascot")
        by_name[name.strip().lower()].append(t["id"])
        by_slug[display_slug(t)].append(t["id"])
        by_id[t["id"]].append(t["name"])

        if name != name.strip() or "  " in name:
            err(f"name has stray whitespace: {t['id']} -> {name!r}")
            whitespace += 1
        if any(unicodedata.category(c) == "Cc" for c in name):
            err(f"name has control characters: {t['id']} -> {name!r}")
        if not name.isascii():
            warn(f"non-ascii name: {t['id']} -> {name!r}")
            nonascii += 1
        if not mascot:
            note(f"no mascot on record: {t['id']} ({name})")
            no_mascot += 1
        elif name.lower().endswith(mascot.lower()) and not name.endswith(mascot):
            # "Columbus Christian Academy rams" vs mascot "Rams"
            err(f"mascot casing differs from name: {t['id']} -> name={name!r} mascot={mascot!r}")
            casing += 1

        # The MaxPreps URL is the source of truth for who this team is.
        url = t.get("maxprepsUrl") or ""
        m = re.search(r"maxpreps\.com/[a-z]{2}/[^/]+/([^/]+)/football", url)
        if m:
            url_slug = m.group(1)
            if school_slug(t) and school_slug(t) not in url_slug:
                warn(f"name doesn't match its MaxPreps URL: {t['id']}\n"
                     f"        name={name!r} url slug={url_slug!r}")
                url_mismatch += 1
        elif url:
            warn(f"unparseable maxprepsUrl: {t['id']} -> {url}")

    for name, ids in by_name.items():
        if len(ids) > 1:
            err(f"duplicate team name {name!r}: {ids}")
    for slug, ids in by_slug.items():
        if len(ids) > 1:
            err(f"URL SLUG COLLISION /teams/{slug}: {ids}")
    for tid, names in by_id.items():
        if len(names) > 1:
            err(f"duplicate team id {tid}: {names}")

    print(f"  {len(teams)} teams | {len(by_slug)} distinct URL slugs")
    print(f"  whitespace issues {whitespace} | mascot-casing {casing} | "
          f"non-ascii {nonascii} | no mascot {no_mascot} | url mismatch {url_mismatch}")


# ── logos ─────────────────────────────────────────────────────────────────────
def audit_logos(teams: list[dict], opp_logos: dict[str, str]) -> None:
    print("\n=== TEAM LOGOS ===")
    logo_dir = WEB / "team-logos"
    on_disk = {p.name for p in logo_dir.glob("*.png")}
    referenced: set[str] = set()
    missing = tiny = 0
    by_hash: dict[str, list[str]] = collections.defaultdict(list)

    def check(ref: str, owner: str) -> None:
        nonlocal missing, tiny
        fname = ref.rsplit("/", 1)[-1]
        referenced.add(fname)
        path = logo_dir / fname
        if not path.exists():
            err(f"logo file missing: {owner} -> {ref}")
            missing += 1
            return
        data = path.read_bytes()
        if len(data) < 512:
            err(f"logo file suspiciously small ({len(data)}B): {owner} -> {ref}")
            tiny += 1
        head = data[:4]
        kind = ("GIF" if head[:3] == b"GIF" else "PNG" if head == b"\x89PNG"
                else "JPG" if head[:2] == b"\xff\xd8" else "UNKNOWN")
        if kind == "UNKNOWN":
            err(f"logo is not a recognised image: {owner} -> {ref}")
        by_hash[hashlib.sha256(data).hexdigest()].append(owner)

    for t in teams:
        if not t.get("logoUrl"):
            err(f"team has no logoUrl: {t['id']}")
            continue
        check(t["logoUrl"], t["id"])
    for slug, ref in opp_logos.items():
        check(ref, f"opponent:{slug}")

    shared = {h: o for h, o in by_hash.items() if len(o) > 1}
    for _h, owners in list(shared.items())[:12]:
        warn(f"identical logo image shared by {len(owners)}: {owners[:4]}")

    # The logo folder is shared by every season, so a file unreferenced by the
    # season under audit may still be in use by another one.
    orphans = sorted(on_disk - referenced)
    print(f"  {len(on_disk)} files on disk | {len(referenced)} referenced | "
          f"missing {missing} | tiny {tiny} | shared images {len(shared)} | orphans {len(orphans)}")
    if orphans:
        note(f"{len(orphans)} logo files on disk referenced by nothing: {orphans[:6]}")


# ── schedules ─────────────────────────────────────────────────────────────────
def audit_schedules(teams: list[dict], games: list[dict], season: str) -> None:
    print("\n=== SCHEDULES ===")
    by_id = {t["id"]: t for t in teams}
    alias = build_alias_map(teams)

    def res(s: str) -> str | None:
        return s if s in by_id else alias.get(s)

    contests: dict[str, list[dict]] = collections.defaultdict(list)
    per_team: dict[str, set[str]] = collections.defaultdict(set)
    team_days: dict[tuple[str, str], set[str]] = collections.defaultdict(set)
    empty = self_games = bad_status = 0

    for g in games:
        cid = contest_id(g.get("maxprepsUrl")) or g["id"]
        contests[cid].append(g)
        h, a = g["homeTeamId"], g["awayTeamId"]
        if not h or not a:
            err(f"game row with an empty team id: {g['id']}")
            empty += 1
            continue
        rh, ra = res(h), res(a)
        if rh and ra and rh == ra:
            err(f"game where both sides resolve to one team: {g['id']} ({rh})")
            self_games += 1
        for t in (rh, ra):
            if t:
                per_team[t].add(cid)
                team_days[(t, g["date"][:10])].add(cid)
        final = g["status"] == "final"
        has = g["homeScore"] is not None and g["awayScore"] is not None
        if final and not has:
            err(f"final game with no score: {g['id']}")
            bad_status += 1
        if not final and has:
            warn(f"non-final game carrying a score: {g['id']} [{g['status']}]")
            bad_status += 1
        # A season labelled "2026-27" plays Aug-Dec 2026.
        year = season.split("-")[0]
        d = g["date"][:10]
        if not (f"{year}-08-01" <= d <= f"{year}-12-31"):
            warn(f"game dated outside the season: {g['id']} -> {d}")

    playing = {t["id"] for t in teams if per_team.get(t["id"])}
    noplay = [t for t in teams if t["id"] not in playing]
    for t in noplay:
        warn(f"team has no games at all: {t['id']} ({t['classification']})")

    counts = sorted(len(v) for v in per_team.values())
    med = counts[len(counts) // 2] if counts else 0
    thin = [(t, len(c)) for t, c in per_team.items() if len(c) < 5]
    fat = [(t, len(c)) for t, c in per_team.items() if len(c) > 12]
    for t, n in sorted(thin, key=lambda x: x[1])[:10]:
        warn(f"only {n} games scheduled: {by_id[t]['name']}")
    for t, n in sorted(fat, key=lambda x: -x[1])[:10]:
        warn(f"{n} games scheduled (more than a normal season): {by_id[t]['name']}")

    clashes = {k: v for k, v in team_days.items() if len(v) > 1}
    for (t, d), v in sorted(clashes.items())[:20]:
        warn(f"two contests on one day: {by_id[t]['name']} {d} ({len(v)} contests)")

    # A contest between two teams we carry should have both perspective rows.
    one_sided = 0
    for _cid, rows in contests.items():
        sides = {res(s) for r in rows for s in (r["homeTeamId"], r["awayTeamId"])} - {None}
        if len(sides) == 2 and len(rows) == 1:
            one_sided += 1

    lo, hi = (counts[0], counts[-1]) if counts else (0, 0)
    print(f"  {len(games)} rows | {len(contests)} contests | "
          f"{len(playing)}/{len(teams)} teams playing")
    print(f"  games per team: min {lo} / median {med} / max {hi}")
    print(f"  empty ids {empty} | self-games {self_games} | status/score issues {bad_status}")
    print(f"  duplicate team-days {len(clashes)} | "
          f"single-row contests between two of our teams {one_sided}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", default="2026-27")
    args = ap.parse_args()
    d = WEB / "data" / args.season
    teams = json.loads((d / "teams.json").read_text(encoding="utf-8"))
    games = json.loads((d / "games.json").read_text(encoding="utf-8"))
    opp_path = d / "opponent-logos.json"
    opp = json.loads(opp_path.read_text(encoding="utf-8")) if opp_path.exists() else {}

    print(f"Auditing {args.season}: {len(teams)} teams, {len(games)} game rows")
    audit_names(teams)
    audit_logos(teams, opp)
    audit_schedules(teams, games, args.season)

    for label, items in (("ERRORS", ERRORS), ("WARNINGS", WARNINGS), ("NOTES", NOTES)):
        print(f"\n=== {label} ({len(items)}) ===")
        for line in items[:40]:
            print(f"  - {line}")
        if len(items) > 40:
            print(f"  ... and {len(items) - 40} more")
    print(f"\nSUMMARY: {len(ERRORS)} errors, {len(WARNINGS)} warnings, {len(NOTES)} notes")


main()
