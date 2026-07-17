"""Scrape 2026-27 season schedules from MaxPreps for every known team.

Reuses the 2025-26 team list (ids, MaxPreps URLs) and fetches each team's
26-27 schedule page. Teams whose schedule isn't published yet are left
blank — never guessed — and logged to docs/missing-2026-schedules.md.

Outputs (scraper/output/data/2026-27/ + web/public/data/2026-27/):
    teams.json    all teams carried over with zeroed records/stats
    players.json  [] (rosters not scraped)
    games.json    scheduled games from MaxPreps

Usage:
    .venv/Scripts/python scripts/scrape_2026_schedules.py [--limit N]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper import config  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.nextdata import derive_team_season_urls, extract_next_data_payload  # noqa: E402
from scraper.normalize import build_games  # noqa: E402
from scraper.pipeline import _fetch_html  # noqa: E402
from scraper.schedule import parse_schedule  # noqa: E402

SEASON = "2026-27"
SHORT = "26-27"
# A "26-27" page that MaxPreps silently backfills with last season's slate
# would poison the data; only dates from the 2026 calendar year onward count.
MIN_DATE = "2026-05-01"

TEAMS_SRC = ROOT.parent / "web" / "public" / "data" / "2025-26" / "teams.json"
OUT_DIRS = [
    ROOT / "output" / "data" / SEASON,
    ROOT.parent / "web" / "public" / "data" / SEASON,
]
MISSING_MD = ROOT.parent / "docs" / "missing-2026-schedules.md"


def homeaway_truth(html: str) -> dict[str, tuple[str, str]]:
    """Per-contest (awayName, homeName) from the page's JSON-LD events.

    Scheduled games carry a /game/X-vs-Y/ preview URL whose slug is
    ALPHABETICAL (unlike final box scores' away-vs-home .htm slugs), so
    parse_schedule's URL heuristic can't orient them. The JSON-LD event
    name "Away at Home" is explicit instead; sides use MaxPreps short
    names, the same vocabulary as parse_schedule's opponentName.
    """
    truth: dict[str, tuple[str, str]] = {}
    for chunk in html.split('{"@type":"SportsEvent"')[1:]:
        chunk = chunk[:2500]
        nm = re.match(r'\s*,\s*"name":"([^"]+) at ([^"]+)"', chunk)
        cm = re.search(r'/game/[^"]*\?c=([\w-]+)', chunk)
        if nm and cm:
            truth[cm.group(1)] = (nm.group(1).strip(), nm.group(2).strip())
    return truth


def carried_team(t: dict) -> dict:
    nt = json.loads(json.dumps(t))
    nt["season"] = SEASON
    nt["record"] = {"wins": 0, "losses": 0}
    nt["rankings"] = {"stateOverall": None, "stateClass": None, "national": None}
    nt["stats"] = {
        "pointsFor": 0, "pointsAgainst": 0, "yardsFor": 0, "yardsAgainst": 0,
        "passYdsFor": 0, "rushYdsFor": 0, "passYdsAgainst": 0, "rushYdsAgainst": 0,
        "turnoversForced": 0, "turnoversLost": 0,
    }
    for k in ("regionRecord", "homeRecord", "awayRecord", "neutralRecord", "streak"):
        nt[k] = None
    return nt


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    teams = json.loads(TEAMS_SRC.read_text(encoding="utf-8"))
    if args.limit:
        teams = teams[: args.limit]

    missing: list[tuple[dict, str]] = []
    pending: list[tuple[dict, str, list[dict]]] = []  # (team, url, partials)
    # contestId -> (awayName, homeName); short names are global, so truth
    # found on either team's page orients both perspectives.
    truth: dict[str, tuple[str, str]] = {}

    cache = CrawlCache(config.CACHE_DB_PATH)
    async with BrowserHarness(headless=True) as harness:
        for i, t in enumerate(teams):
            url = t.get("maxprepsUrl")
            if not url:
                missing.append((t, "no MaxPreps page on record"))
                continue
            urls = derive_team_season_urls(team_url=url, season_short=SHORT)
            try:
                html = await _fetch_html(harness, urls["schedule"], cache)
                payload = extract_next_data_payload(html)
            except Exception as exc:  # noqa: BLE001
                missing.append((t, f"schedule page fetch failed ({exc})"))
                continue
            if payload is None:
                missing.append((t, "schedule page has no data"))
                continue
            partials = [
                g for g in parse_schedule(payload, team_url=url)
                if (g.get("date") or "") >= MIN_DATE
            ]
            if not partials:
                missing.append((t, "no 2026 games listed on MaxPreps yet"))
                continue
            truth.update(homeaway_truth(html))
            pending.append((t, url, partials))
            print(f"[{i + 1}/{len(teams)}] {t['name']}: {len(partials)} games", flush=True)

    # Fix each row's homeOrAway from JSON-LD "Away at Home" event names,
    # matched by contest id and oriented via the row's opponentName.
    fixed = defaulted = 0
    rows_by_contest: dict[str, list[dict]] = {}
    for t, url, partials in pending:
        for g in partials:
            if g.get("contestId"):
                rows_by_contest.setdefault(g["contestId"], []).append(g)
            g["_fixed"] = False
            sides = truth.get(g.get("contestId") or "")
            opp = (g.get("opponentName") or "").strip()
            if sides and opp:
                away_name, home_name = sides
                if opp == home_name and opp != away_name:
                    g["homeOrAway"] = "away"
                    g["_fixed"] = True
                    fixed += 1
                    continue
                if opp == away_name and opp != home_name:
                    g["homeOrAway"] = "home"
                    g["_fixed"] = True
                    fixed += 1
                    continue
            defaulted += 1

    # The two perspective rows of one contest must be complementary; when
    # JSON-LD resolved only one (or neither), reconcile the pair so the
    # runtime merge still yields canonical ids for both teams.
    reconciled = 0
    for rows in rows_by_contest.values():
        if len(rows) != 2:
            continue
        a, b = rows
        if a["_fixed"] and not b["_fixed"]:
            b["homeOrAway"] = "away" if a["homeOrAway"] == "home" else "home"
            reconciled += 1
        elif b["_fixed"] and not a["_fixed"]:
            a["homeOrAway"] = "away" if b["homeOrAway"] == "home" else "home"
            reconciled += 1
        elif not a["_fixed"] and a["homeOrAway"] == b["homeOrAway"]:
            # No signal at all: orientation is a guess, but keep it consistent.
            b["homeOrAway"] = "away" if a["homeOrAway"] == "home" else "home"
            reconciled += 1
    print(f"reconciled {reconciled} paired rows", flush=True)

    games_out: list[dict] = []
    found = 0
    for t, url, partials in pending:
        for g in partials:
            g.pop("_fixed", None)
        games = build_games(
            season=SEASON, team_id=t["id"], opponent_lookup={},
            schedule=partials, box_scores={}, player_label_to_id={},
        )
        games_out.extend(g.model_dump(by_alias=True) for g in games)
        found += 1
    print(f"home/away: {fixed} from JSON-LD, {defaulted} defaulted", flush=True)

    # Dedupe by game id (matches the season pipeline's behaviour).
    seen: dict[str, dict] = {}
    for g in games_out:
        seen.setdefault(g["id"], g)
    games_final = sorted(seen.values(), key=lambda g: (g["date"], g["id"]))

    teams_final = [carried_team(t) for t in teams]
    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / "teams.json").write_text(json.dumps(teams_final, indent=2), encoding="utf-8")
        (d / "players.json").write_text("[]", encoding="utf-8")
        (d / "games.json").write_text(json.dumps(games_final, indent=2), encoding="utf-8")

    # Missing-schedules report.
    by_class = Counter(t["classification"] for t, _ in missing)
    lines = [
        "# Missing 2026 Schedules",
        "",
        f"Generated {__import__('datetime').date.today().isoformat()} from MaxPreps "
        f"(26-27 season pages). {found} of {len(teams)} teams have a published "
        f"schedule; the {len(missing)} below do not. Their schedules are left "
        "blank on the site — nothing is invented.",
        "",
    ]
    if missing:
        lines += ["| Team | Class | Reason |", "|---|---|---|"]
        for t, reason in sorted(missing, key=lambda x: (x[0]["classification"], x[0]["name"])):
            lines.append(f"| {t['name']} | {t['classification']} | {reason} |")
        lines += ["", "By classification: " + ", ".join(
            f"{c}: {n}" for c, n in sorted(by_class.items())
        )]
    else:
        lines.append("All teams have a published 2026 schedule.")
    MISSING_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nDONE: {found}/{len(teams)} teams with schedules, "
          f"{len(games_final)} unique games, {len(missing)} missing "
          f"-> {MISSING_MD.name}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
