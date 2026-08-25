"""Download logos for opponents we don't carry as teams.

63 opponent slugs in games.json belong to schools outside our 309-team
footprint — out-of-state opponents, homeschool co-ops, private schools MaxPreps
lists but we don't rank. They render with a blank placeholder on schedules and
team pages.

The logo URL is already sitting in each schedule page's payload: every contest
row carries `opponentLogoUrl` for the *other* school, taken from that school's
entry on our team's own schedule page. That is the same link you would click
through from the opponent's row, so there is no ambiguity about which
"Ravenwood" or "Franklin Academy" is meant — it comes from the matchup itself.

Reads schedule pages from the crawl cache by default (the refresh run already
fetched all 309), so normally this only downloads images.

Usage:
    .venv/Scripts/python scripts/fetch_opponent_logos.py --dry-run
    .venv/Scripts/python scripts/fetch_opponent_logos.py
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper import config  # noqa: E402
from scraper import slugify as slug_mod  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.logos import download_team_logo  # noqa: E402
from scraper.nextdata import derive_team_season_urls, extract_next_data_payload  # noqa: E402
from scraper.opponents import STATE_CODES, build_alias_map  # noqa: E402
from scraper.pipeline import _fetch_html  # noqa: E402
from scraper.schedule import parse_schedule  # noqa: E402

SEASON = "2026-27"
SHORT = "26-27"
WEB = ROOT.parent / "web" / "public"
WEB_DIR = WEB / "data" / SEASON
LOGO_DIR = WEB / "team-logos"
OUT_JSON = "opponent-logos.json"
DATA_DIRS = [ROOT / "output" / "data" / SEASON, WEB_DIR]

CONTEST_RE = re.compile(r"[?&](?:c|contestid)=([\w-]+)", re.I)


def contest_id(url: str | None) -> str | None:
    m = CONTEST_RE.search(url or "")
    return m.group(1) if m else None


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force-fetch", action="store_true",
                    help="re-crawl schedule pages instead of using the cache")
    args = ap.parse_args()

    teams = json.loads((WEB_DIR / "teams.json").read_text(encoding="utf-8"))
    games = json.loads((WEB_DIR / "games.json").read_text(encoding="utf-8"))
    by_id = {t["id"] for t in teams}
    alias = build_alias_map(teams)

    def resolves(slug: str) -> bool:
        return slug in by_id or slug in alias

    # Opponent slugs actually used by game rows that resolve to no team of ours.
    wanted = {
        s for g in games for s in (g["homeTeamId"], g["awayTeamId"])
        if s and not resolves(s)
    }
    print(f"{len(wanted)} unresolved opponent slugs in games.json", flush=True)

    # Match by CONTEST, not by name. Two different schools can share a name —
    # Germantown MS vs Germantown TN, the two Lee Academies, the two
    # Enterprises — so slugify(opponentName) is ambiguous and picking the first
    # match grabs the wrong crest. A contest id identifies one specific game,
    # and the opponent on that game is unambiguous.
    #
    # Every row of a contest that we scraped came from one of OUR team's pages,
    # so the unresolved side of that contest is always the opponent.
    contest_to_slug: dict[str, str] = {}
    for g in games:
        cid = contest_id(g.get("maxprepsUrl"))
        if not cid:
            continue
        for side in (g["homeTeamId"], g["awayTeamId"]):
            if side in wanted:
                contest_to_slug[cid] = side

    # slug -> (logo url, opponent name, seen on which team's page)
    found: dict[str, tuple[str, str, str]] = {}
    cache = CrawlCache(config.CACHE_DB_PATH)
    async with BrowserHarness(headless=True) as h:
        for i, t in enumerate(teams, 1):
            if not t.get("maxprepsUrl"):
                continue
            urls = derive_team_season_urls(team_url=t["maxprepsUrl"], season_short=SHORT)
            try:
                html = await _fetch_html(h, urls["schedule"], cache, force=args.force_fetch)
                payload = extract_next_data_payload(html)
            except Exception as exc:  # noqa: BLE001
                print(f"  [{i}] {t['name']}: fetch failed ({type(exc).__name__})", flush=True)
                continue
            if payload is None:
                continue
            for row in parse_schedule(payload, team_url=t["maxprepsUrl"]):
                name = (row.get("opponentName") or "").strip()
                logo = row.get("opponentLogoUrl")
                cid = row.get("contestId")
                if not name or not logo or not cid:
                    continue
                slug = contest_to_slug.get(cid)
                if not slug or slug in found:
                    continue
                # The contest picks the right GAME; the opponent name picks the
                # right SIDE of it. Without this, a contest between two of our
                # teams takes whichever perspective row is scanned first — and
                # assigns the wrong school's crest.
                head, _, tail = slug.rpartition("-")
                base = head if head and tail in STATE_CODES else slug
                if slug_mod.team_id(name, None) not in (slug, base):
                    continue
                found[slug] = (logo, name, t["name"])

    missing = sorted(wanted - set(found))
    print(f"\nlogo URL found for {len(found)}/{len(wanted)} opponents"
          f"{f'; none for {len(missing)}' if missing else ''}")
    for slug in missing:
        print(f"    no logo url: {slug}")

    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    mapping: dict[str, str] = {}
    downloaded = reused = failed = 0
    for slug, (url, name, via) in sorted(found.items()):
        if args.dry_run:
            print(f"  would fetch {slug:38s} ({name}, via {via})")
            mapping[slug] = f"/team-logos/{slug}.png"
            continue
        existed = (LOGO_DIR / f"{slug}.png").exists()
        path = await download_team_logo(team_id=slug, logo_url=url, out_dir=LOGO_DIR)
        if path is None:
            print(f"  FAILED {slug} <- {url[:70]}")
            failed += 1
            continue
        mapping[slug] = f"/team-logos/{slug}.png"
        if existed:
            reused += 1
        else:
            downloaded += 1
            print(f"  got {slug:38s} ({name}, via {via})")

    print(f"\ndownloaded {downloaded}, already on disk {reused}, failed {failed}")
    if args.dry_run:
        print("[dry-run] nothing written")
        return
    for d in DATA_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / OUT_JSON).write_text(
            json.dumps(dict(sorted(mapping.items())), indent=2), encoding="utf-8",
        )
    print(f"wrote {OUT_JSON} with {len(mapping)} entries to {len(DATA_DIRS)} dirs")


asyncio.run(main())
