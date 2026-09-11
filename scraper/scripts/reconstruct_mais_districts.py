"""Reconstruct real MAIS district groupings from MaxPreps' own district hub pages.

Why this exists: `district` on teams.json is stale for several MAIS-4A teams
(never touched by `refresh_2026_schedules.py` by design), and MaxPreps' own
per-team "district standings" table can't fill the gap by itself -- some teams
have no self-reported league at all, and a schedule's per-game "conference
game" flag turns out to be a broader signal than "district" (e.g. Jackson
Academy's schedule flags games against Magnolia Heights/Bayou Academy as
"conference" even though neither belongs to Jackson Academy's real district).

The actual ground truth is MaxPreps' `leagueStanding.canonicalUrl`, a stable
per-district hub URL keyed by a `leagueid` GUID. Each team's own schedule page
reports which hub (if any) it belongs to; the hub page itself lists every
member with an authoritative "conference" record. This script:

  1. Reads each MAIS team's own schedule-page cache for its leagueId + hub
     canonicalUrl (teams with no published leagueId yet are left unresolved).
  2. Fetches (or reuses a cached copy of) each distinct hub page and reads its
     full member roster + hub-reported district name straight off tableData.
  3. Patches `district` on every team the hub confirms is a member -- even
     across nominal classification lines (MAIS has districts that mix e.g.
     3A and 4A schools; `classification` is a separate enrollment label from
     `district`, see web/lib/standings.ts's collectRegionState) -- as long as
     the hub's component includes at least one team of --classification-scope.

Usage:
    .venv/Scripts/python scripts/reconstruct_mais_districts.py            # report only
    .venv/Scripts/python scripts/reconstruct_mais_districts.py --apply    # patch teams.json
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

from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.nextdata import extract_next_data_payload  # noqa: E402

SEASON_SHORT = "26-27"
DEFAULT_CACHE_DB = ROOT / ".cache" / "crawl.db"
MAIN_REPO_CACHE_DB = Path(
    r"C:\Users\garre\OneDrive\Desktop\Claude Code\varsity-voices-dashboard\scraper\.cache\crawl.db"
)
DATA_FILES = [
    ROOT / "output" / "data" / "2026-27" / "teams.json",
    ROOT.parent / "web" / "public" / "data" / "2026-27" / "teams.json",
    Path(
        r"C:\Users\garre\OneDrive\Desktop\Claude Code\varsity-voices-dashboard\scraper\output\data\2026-27\teams.json"
    ),
]

_LEAGUEID_RE = re.compile(r"leagueid=([\w-]+)")


def own_league(payload: dict) -> tuple[str, str] | None:
    """(leagueId, canonicalUrl) this team's own schedule page reports, or None."""
    page_props = payload.get("pageProps") or payload.get("props", {}).get("pageProps", {})
    ls = (page_props.get("teamContext", {}).get("standingsData") or {}).get("leagueStanding") or {}
    canonical = ls.get("canonicalUrl")
    m = _LEAGUEID_RE.search(canonical or "")
    if not m:
        return None
    return m.group(1), canonical


async def fetch_hub(harness: BrowserHarness, cache: CrawlCache, url: str) -> dict | None:
    hit = cache.get(url)
    if hit is None:
        async with harness.page() as page:
            await page.goto(url, wait_until="domcontentloaded")
            html = await page.content()
        cache.put(url, body=html, status=200)
        await harness.jitter()
    else:
        html = hit.body
    return extract_next_data_payload(html)


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="patch teams.json for resolved hubs")
    ap.add_argument("--cache-db", type=Path, default=None)
    ap.add_argument(
        "--classification-scope", default="MAIS-4A",
        help="only patch a hub's members if the hub includes at least one team of this classification",
    )
    args = ap.parse_args()

    cache_path = args.cache_db or (MAIN_REPO_CACHE_DB if MAIN_REPO_CACHE_DB.exists() else DEFAULT_CACHE_DB)
    cache = CrawlCache(cache_path)
    print(f"using cache db: {cache_path}")

    teams = json.loads(DATA_FILES[1].read_text(encoding="utf-8"))
    mais = [t for t in teams if (t.get("classification") or "").startswith("MAIS")]
    by_url = {(t.get("maxprepsUrl") or "").rstrip("/"): t for t in teams}

    unresolved: list[dict] = []
    hub_urls: dict[str, str] = {}  # leagueId -> canonicalUrl
    team_league: dict[str, str] = {}  # team.id -> leagueId

    for t in mais:
        url = t.get("maxprepsUrl")
        if not url:
            unresolved.append(t)
            continue
        sched_url = url.rstrip("/") + f"/{SEASON_SHORT}/schedule"
        hit = cache.get(sched_url)
        if hit is None:
            print(f"  no cached schedule page, skipping: {t['id']}")
            unresolved.append(t)
            continue
        payload = extract_next_data_payload(hit.body)
        league = own_league(payload) if payload else None
        if league is None:
            unresolved.append(t)
            continue
        league_id, canonical = league
        team_league[t["id"]] = league_id
        hub_urls.setdefault(league_id, canonical)

    print(f"{len(mais)} MAIS teams | {len(hub_urls)} distinct district hubs found | "
          f"{len(unresolved)} teams with no published hub\n")

    async with BrowserHarness(headless=True) as h:
        hub_payloads = {}
        for league_id, url in hub_urls.items():
            hub_payloads[league_id] = await fetch_hub(h, cache, url)

    by_id = {t["id"]: t for t in teams}
    proposed: dict[str, str] = {}
    in_scope_hubs = 0

    for league_id, payload in hub_payloads.items():
        if payload is None:
            print(f"  hub fetch failed for leagueId {league_id}")
            continue
        pp = payload.get("pageProps") or payload.get("props", {}).get("pageProps", {})
        title = (pp.get("pageTitle") or "").replace(" District Football Standings.", "")
        table = pp.get("layoutProps", {}).get("tableData", [])
        members = []
        for row in table:
            canon = (row.get("teamCanonicalUrl") or "").rstrip("/")
            member = by_url.get(canon)
            if member:
                members.append(member)
            else:
                print(f"    [{title}] hub member not in teams.json: {row.get('schoolName')}")

        classes = {m.get("classification") for m in members}
        in_scope = args.classification_scope in classes
        print(f"hub {title!r} (leagueId {league_id}, {len(members)} members, classes={classes})"
              f"{'  <- in scope' if in_scope else ''}")
        for m in members:
            marker = "OK" if m.get("district") == title else "CHANGE"
            print(f"    [{marker}] {m['name']:42s} class={m.get('classification'):10s} old={m.get('district')}")
        if in_scope:
            in_scope_hubs += 1
            for m in members:
                proposed[m["id"]] = title

    print(f"\n{in_scope_hubs} hubs touch {args.classification_scope}; "
          f"{len(proposed)} teams have a hub-confirmed district.")

    if unresolved:
        print("\nunresolved (no MaxPreps hub published yet -- needs a human call):")
        for t in unresolved:
            if (t.get("classification") or "").startswith(args.classification_scope[:9]):
                print(f"    {t['name']:42s} class={t.get('classification')} old_district={t.get('district')}")

    if not args.apply:
        print("\n[dry-run] pass --apply to patch teams.json")
        return

    for path in DATA_FILES:
        if not path.exists():
            print(f"skip missing {path}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        patched = 0
        for t in data:
            new_district = proposed.get(t["id"])
            if new_district and new_district != t.get("district"):
                print(f"  {path.name}: {t['id']}: {t.get('district')!r} -> {new_district!r}")
                t["district"] = new_district
                patched += 1
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(f"{path}: {patched} teams patched")


if __name__ == "__main__":
    asyncio.run(main())
