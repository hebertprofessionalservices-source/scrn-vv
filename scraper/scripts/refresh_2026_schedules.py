"""Re-scrape every team's 2026-27 schedule and rebuild games.json from scratch.

Why this exists: the July schedule scrape goes stale. MaxPreps drops preseason
contests, swaps opponents, re-issues contest ids and moves dates, so rows
accumulate that will never receive a result — 41 MHSAA contests were sitting on
2026-08-21 in August 2026 for games MaxPreps no longer lists at all.

Unlike `scrape_2026_schedules.py`, this preserves what a results run has already
earned:

  * team records / points / splits / streaks are re-derived from schedule finals
    rather than zeroed (that script's `carried_team` wipes them)
  * box scores already scraped are carried across by contest id
  * classification, district, coach, logo, colors and prior-season rankings on
    each team are left untouched

Only teams whose schedule page is fetched successfully have their rows replaced,
so a failed fetch never silently deletes a team's season.

Usage:
    .venv/Scripts/python scripts/refresh_2026_schedules.py --dry-run
    .venv/Scripts/python scripts/refresh_2026_schedules.py
    .venv/Scripts/python scripts/refresh_2026_schedules.py --limit 20   # smoke test
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper import config  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.nextdata import (  # noqa: E402
    derive_team_season_urls,
    extract_next_data_payload,
    extract_overall_standing,
    extract_region_record,
)
from scraper.normalize import build_games  # noqa: E402
from scraper.opponents import disambiguate_opponents  # noqa: E402
from scraper.pipeline import _fetch_html  # noqa: E402
from scraper.schedule import parse_schedule  # noqa: E402
from scraper.schedule_rows import derive_record, homeaway_truth, orient  # noqa: E402

SEASON = "2026-27"
SHORT = "26-27"
MIN_DATE = "2026-05-01"

DATA_DIRS = [
    ROOT / "output" / "data" / SEASON,
    ROOT.parent / "web" / "public" / "data" / SEASON,
]
WEB_DIR = ROOT.parent / "web" / "public" / "data" / SEASON
MISSING_MD = ROOT.parent / "docs" / "missing-2026-schedules.md"

CONTEST_RE = re.compile(r"[?&](?:c|contestid)=([\w-]+)", re.I)


def contest_id(url: str | None) -> str | None:
    m = CONTEST_RE.search(url or "")
    return m.group(1) if m else None


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None, help="first N teams only (smoke test)")
    ap.add_argument("--use-cache", action="store_true", help="reuse cached pages (re-analysis)")
    args = ap.parse_args()
    force = not args.use_cache

    teams = json.loads((WEB_DIR / "teams.json").read_text(encoding="utf-8"))
    games = json.loads((WEB_DIR / "games.json").read_text(encoding="utf-8"))
    subset = teams[: args.limit] if args.limit else teams

    # Box scores are expensive to gather — carry them across the rebuild.
    box_by_contest: dict[str, tuple[dict, str]] = {}
    for g in games:
        cid = contest_id(g.get("maxprepsUrl"))
        if cid and g.get("boxScore"):
            box_by_contest[cid] = (g["boxScore"], g.get("dataStatus", "missing"))
    print(f"carrying {len(box_by_contest)} contests' box scores across the rebuild\n", flush=True)

    cache = CrawlCache(config.CACHE_DB_PATH)
    scraped: list[tuple[dict, list[dict]]] = []
    truth: dict[str, tuple[str, str]] = {}
    no_schedule: list[tuple[dict, str]] = []
    standing: dict[str, dict] = {}
    failed: list[str] = []

    async with BrowserHarness(headless=True) as h:
        for i, t in enumerate(subset, 1):
            url = t.get("maxprepsUrl")
            if not url:
                no_schedule.append((t, "no MaxPreps page on record"))
                continue
            urls = derive_team_season_urls(team_url=url, season_short=SHORT)
            try:
                html = await _fetch_html(h, urls["schedule"], cache, force=force)
                payload = extract_next_data_payload(html)
            except Exception as exc:  # noqa: BLE001
                print(f"[{i}/{len(subset)}] {t['name']}: FETCH FAILED "
                      f"({type(exc).__name__})", flush=True)
                failed.append(t["id"])
                continue
            if payload is None:
                no_schedule.append((t, "schedule page has no data"))
                continue
            rows = [
                g for g in parse_schedule(payload, team_url=url)
                if (g.get("date") or "") >= MIN_DATE
                # MaxPreps carries placeholder contests with no opponent at all
                # (a TBD or bye); those build a row with an empty team id that
                # renders as "@ " with a blank name.
                and (g.get("opponentName") or "").strip()
            ]
            if not rows:
                no_schedule.append((t, "no 2026 games listed on MaxPreps yet"))
                # still counts as refreshed: MaxPreps genuinely lists nothing
            truth.update(homeaway_truth(html))
            standing[t["id"]] = {
                "regionRecord": extract_region_record(payload),
                "standing": extract_overall_standing(payload),
            }
            scraped.append((t, rows))
            print(f"[{i}/{len(subset)}] {t['name']}: {len(rows)} games", flush=True)

    # Orientation needs every page's JSON-LD collected first.
    all_rows = [r for _, rows in scraped for r in rows]
    fixed, defaulted, reconciled = orient(all_rows, truth)
    print(f"\nhome/away: {fixed} from MaxPreps, {defaulted} defaulted, {reconciled} reconciled")

    fresh: list[dict] = []
    team_patch: dict[str, dict] = {}
    for t, rows in scraped:
        built = build_games(
            season=SEASON, team_id=t["id"], opponent_lookup={},
            schedule=rows, box_scores={}, player_label_to_id={},
        )
        fresh.extend(g.model_dump(by_alias=True) for g in built)
        record, pf, pa = derive_record(rows)
        team_patch[t["id"]] = {"record": record, "pointsFor": pf, "pointsAgainst": pa}

    refreshed = {t["id"] for t, _ in scraped}

    # A row carries its own team's canonical id; the opponent side is a slug. So
    # rows "belonging to" a refreshed team are exactly those with its id on a side.
    kept, dropped = [], []
    for g in games:
        if refreshed & {g["homeTeamId"], g["awayTeamId"]}:
            dropped.append(g)
        else:
            kept.append(g)

    merged: dict[str, dict] = {}
    for g in kept + fresh:
        merged.setdefault(g["id"], g)

    # Reattach box scores, and report contests that vanished entirely.
    live_contests = {contest_id(g.get("maxprepsUrl")) for g in merged.values()}
    restored = 0
    for g in merged.values():
        cid = contest_id(g.get("maxprepsUrl"))
        if cid and cid in box_by_contest and not g.get("boxScore"):
            g["boxScore"], g["dataStatus"] = box_by_contest[cid]
            restored += 1
    lost_box = [c for c in box_by_contest if c not in live_contests]

    games_final = sorted(merged.values(), key=lambda g: (g["date"], g["id"]))
    fixes = disambiguate_opponents(games_final, teams)

    # Patch team records without touching identity/classification/rankings.
    for t in teams:
        p = team_patch.get(t["id"])
        if not p:
            continue
        t["record"] = p["record"]
        t["stats"] = {
            **t["stats"], "pointsFor": p["pointsFor"], "pointsAgainst": p["pointsAgainst"],
        }
        st = standing.get(t["id"]) or {}
        if st.get("regionRecord") is not None:
            t["regionRecord"] = st["regionRecord"]
        for k in ("homeRecord", "awayRecord", "neutralRecord", "streak"):
            if (st.get("standing") or {}).get(k) is not None:
                t[k] = st["standing"][k]

    old_contests = {contest_id(g.get("maxprepsUrl")) for g in games} - {None}
    new_contests = {contest_id(g.get("maxprepsUrl")) for g in games_final} - {None}
    gone, added = old_contests - new_contests, new_contests - old_contests

    by_date = defaultdict(int)
    for g in games:
        if contest_id(g.get("maxprepsUrl")) in gone:
            by_date[g["date"][:10]] += 1

    print(f"\nteams refreshed: {len(refreshed)}/{len(subset)}"
          f" | no schedule: {len(no_schedule)} | fetch failures: {len(failed)}")
    print(f"rows: {len(games)} -> {len(games_final)} "
          f"(replaced {len(dropped)}, {len(fresh)} fresh in)")
    print(f"contests dropped: {len(gone)} | newly appeared: {len(added)}")
    if by_date:
        print("dropped contests by date (top 10):")
        for d, n in sorted(by_date.items(), key=lambda kv: -kv[1])[:10]:
            print(f"    {d}: {n} rows")
    print(f"box scores: {restored} reattached, {len(lost_box)} whose contest no longer exists")
    if fixes:
        print(f"out-of-state opponents disambiguated: {len(fixes)}")
    finals = sum(1 for g in games_final if g["status"] == "final")
    print(f"final rows in file: {finals}")

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return
    for d in DATA_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / "games.json").write_text(json.dumps(games_final, indent=2), encoding="utf-8")
        (d / "teams.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    print(f"\nwrote games.json + teams.json to {len(DATA_DIRS)} dirs")


asyncio.run(main())
