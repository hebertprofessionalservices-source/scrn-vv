"""Scrape 2026-27 rosters for every known team into players.json.

`scrape_2026_schedules.py` wrote players.json as `[]`, so every team page's
Roster section is empty and nothing exists for box-score stats to attach to.
This fills that in. Stats are left at zero — season aggregates come from
`scrape_2026_boxscores.py`, since MaxPreps' season-stats pages stay empty for
most of these schools even when per-game box scores exist.

Usage:
    .venv/Scripts/python scripts/scrape_2026_rosters.py [--limit N] [--only SUBSTR]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper import config  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.nextdata import derive_team_season_urls, extract_next_data_payload  # noqa: E402
from scraper.normalize import build_players  # noqa: E402
from scraper.pipeline import _fetch_html  # noqa: E402
from scraper.roster import parse_roster  # noqa: E402

SEASON = "2026-27"
SHORT = "26-27"
OUT_DIRS = [
    ROOT / "output" / "data" / SEASON,
    ROOT.parent / "web" / "public" / "data" / SEASON,
]
WEB_DIR = ROOT.parent / "web" / "public" / "data" / SEASON


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--only", help="substring match on team name")
    ap.add_argument("--force", action="store_true", help="bypass the crawl cache")
    args = ap.parse_args()

    teams = json.loads((WEB_DIR / "teams.json").read_text(encoding="utf-8"))
    if args.only:
        teams = [t for t in teams if args.only.lower() in t["name"].lower()]
    if args.limit:
        teams = teams[: args.limit]

    existing = json.loads((WEB_DIR / "players.json").read_text(encoding="utf-8"))
    by_team: dict[str, list[dict]] = {}
    for p in existing:
        by_team.setdefault(p["teamId"], []).append(p)

    cache = CrawlCache(config.CACHE_DB_PATH)
    ok = empty = failed = 0
    async with BrowserHarness(headless=True) as h:
        for i, t in enumerate(teams, 1):
            url = t.get("maxprepsUrl")
            if not url:
                failed += 1
                continue
            urls = derive_team_season_urls(team_url=url, season_short=SHORT)
            try:
                html = await _fetch_html(h, urls["roster"], cache, force=args.force)
                payload = extract_next_data_payload(html)
                roster = parse_roster(payload) if payload else []
            except Exception as exc:  # noqa: BLE001
                print(f"[{i}/{len(teams)}] {t['name']}: FAILED ({exc})", flush=True)
                failed += 1
                continue
            if not roster:
                print(f"[{i}/{len(teams)}] {t['name']}: no roster published", flush=True)
                empty += 1
                continue
            players = build_players(
                team_id=t["id"], season=SEASON, roster=roster,
                season_stats={}, games_played_by_label={},
            )
            by_team[t["id"]] = [p.model_dump(by_alias=True) for p in players]
            ok += 1
            print(f"[{i}/{len(teams)}] {t['name']}: {len(players)} players", flush=True)

    # MaxPreps lists some players twice (e.g. an offense and a defense entry),
    # which would double them up in the Roster section and make box-score name
    # joins ambiguous. Dedupe by id, matching dedupe_output.py.
    deduped: dict[str, dict] = {}
    raw_count = 0
    for tid in sorted(by_team):
        for p in by_team[tid]:
            raw_count += 1
            deduped[p["id"]] = p
    players_out = list(deduped.values())
    if raw_count != len(players_out):
        print(f"deduped {raw_count - len(players_out)} duplicate player records", flush=True)
    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / "players.json").write_text(json.dumps(players_out, indent=2), encoding="utf-8")

    print(f"\nDONE: {ok} teams with rosters, {empty} unpublished, {failed} failed "
          f"-> {len(players_out)} players", flush=True)


asyncio.run(main())
