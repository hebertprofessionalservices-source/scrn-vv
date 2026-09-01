"""Enrich players.json with full season stats from MaxPreps print pages.

The team stats pages (already cached in .cache/crawl.db) only expose top-3
leader entries, so players.json shipped with zeroed yardage. Each stats page
links to a print view (print/team_stats.aspx?schoolid=X&ssid=Y) that renders
complete season tables for every player, with semantic td classes
(passingyards, gamesplayed, ...) and the athlete's full name in the anchor
title attribute.

This script:
  1. Extracts each team's print URL from that season's stats page (fetched if
     it isn't cached yet — the print URL's ssid is season-specific).
  2. Fetches the print pages (cached in crawl.db, so re-runs are free).
  3. Parses every stat table into per-athlete flat dicts.
  4. Joins athletes to players.json rows by normalized name (fallback:
     jersey + last name) and rebuilds player stats + gamesPlayed.
  5. Rebuilds team-level yardage/turnover totals from the Season Totals rows.
  6. Writes enriched players.json / teams.json and a match-rate report.

Team totals here are SEASON-TO-DATE, not per-week: the print page's tfoot rows
are "Season Totals". MaxPreps exposes no weekly split, so an in-season re-run
just refreshes the cumulative numbers.

Usage:
    .venv/Scripts/python scripts/enrich_print_stats.py [--season 2026-27]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

import httpx
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper.cache import CrawlCache  # noqa: E402

CACHE_PATH = ROOT / ".cache" / "crawl.db"


def season_fragment(season: str) -> str:
    """'2026-27' -> '26-27', the form MaxPreps puts in stats-page URLs."""
    start, end = season.split("-")
    return f"{start[2:]}-{end}"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
FETCH_DELAY_SECONDS = 0.6

NEXT_DATA_RE = re.compile(
    r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S
)
NON_ALPHA_RE = re.compile(r"[^a-z ]+")


def normalize_name(name: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace for join keys."""
    cleaned = NON_ALPHA_RE.sub(" ", name.lower())
    return " ".join(cleaned.split())


def print_url_from_stats_page(html: str) -> str | None:
    """The Print link out of a stats page's __NEXT_DATA__ payload."""
    match = NEXT_DATA_RE.search(html)
    if not match:
        return None
    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    page_props = payload.get("props", {}).get("pageProps", {})
    for link in page_props.get("sharedStatsLinks") or []:
        if link.get("displayText") == "Print":
            return link["canonicalUrl"]
    return None


def extract_print_urls(
    client: httpx.Client,
    cache: CrawlCache,
    teams: list[dict],
    fragment: str,
) -> dict[str, str]:
    """Map teamId -> print stats URL, fetching stats pages not yet cached.

    The print URL carries a season-specific ssid, so it has to come from that
    season's own stats page — it can't be constructed.
    """
    result: dict[str, str] = {}
    for team in teams:
        stats_url = f"{team['maxprepsUrl'].rstrip('/')}/{fragment}/stats"
        html = fetch_page(client, cache, stats_url)
        if html is None:
            continue
        url = print_url_from_stats_page(html)
        if url is not None:
            result[team["id"]] = url
    return result


def fetch_page(client: httpx.Client, cache: CrawlCache, url: str) -> str | None:
    hit = cache.get(url)
    if hit is not None and hit.status == 200:
        return hit.body
    try:
        response = client.get(url)
    except httpx.HTTPError as exc:
        print(f"  FETCH ERROR {url}: {exc}", flush=True)
        return None
    cache.put(url, body=response.text, status=response.status_code)
    time.sleep(FETCH_DELAY_SECONDS)
    if response.status_code != 200:
        print(f"  HTTP {response.status_code} for {url}", flush=True)
        return None
    return response.text


def coerce(value: str) -> float | int:
    value = value.strip().replace(",", "")
    if not value or value in {"-", "--"}:
        return 0
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        return 0


def parse_print_page(html: str) -> tuple[dict[str, dict[str, Any]], dict[str, float]]:
    """Parse all stat tables.

    Returns:
        athletes: normalized-name -> {name, jersey, flat stat dict}
        totals:   flat stat dict from Season Totals rows (team-level)
    """
    soup = BeautifulSoup(html, "html.parser")
    athletes: dict[str, dict[str, Any]] = {}
    totals: dict[str, float] = {}

    for table in soup.find_all("table"):
        tbody = table.find("tbody")
        if tbody is not None:
            for tr in tbody.find_all("tr"):
                anchor = tr.find("a")
                if anchor is None:
                    continue
                full_name = anchor.get("title") or anchor.get_text(strip=True)
                key = normalize_name(full_name)
                jersey_td = tr.find("td", class_="jersey")
                entry = athletes.setdefault(
                    key,
                    {
                        "name": full_name,
                        "jersey": jersey_td.get_text(strip=True) if jersey_td else "",
                        "stats": {},
                    },
                )
                for td in tr.find_all("td"):
                    classes = td.get("class") or []
                    if "stat" not in classes:
                        continue
                    stat_key = classes[0]
                    value = coerce(td.get_text(strip=True))
                    if stat_key == "gamesplayed":
                        entry["stats"][stat_key] = max(
                            entry["stats"].get(stat_key, 0), value
                        )
                    else:
                        entry["stats"][stat_key] = value

        tfoot = table.find("tfoot")
        if tfoot is not None:
            for td in tfoot.find_all("td"):
                classes = td.get("class") or []
                if "stat" not in classes:
                    continue
                stat_key = classes[0]
                if stat_key not in totals:
                    totals[stat_key] = coerce(td.get_text(strip=True))

    return athletes, totals


def build_player_stats(flat: dict[str, float]) -> dict[str, Any]:
    def g(key: str) -> float | int:
        return flat.get(key, 0) or 0

    return {
        "passing": {
            "att": g("passingatt"),
            "cmp": g("passingcomp"),
            "yds": g("passingyards"),
            "td": g("passingtd"),
            "int": g("passingint"),
            "rating": g("qbrating"),
        },
        "rushing": {
            "att": g("rushingnum"),
            "yds": g("rushingyards"),
            "td": g("rushingtdnum"),
            "ypc": g("yardspercarry"),
        },
        "receiving": {
            "rec": g("receivingnum"),
            "yds": g("receivingyards"),
            "td": g("receivingtdnum"),
        },
        "defense": {
            "tackles": g("totaltackles"),
            "sacks": g("sacks"),
            "int": g("ints"),
            "ff": g("causedfumbles"),
        },
        "kicking": {
            "fgm": g("fgmade"),
            "fga": g("fgattempted"),
            "xpm": g("patkickingmade"),
            "xpa": g("patkickingatt"),
        },
    }


def _position_stat(player: dict, position: str) -> float:
    """How much the player's stats support playing this position."""
    stats = player["stats"]
    if position == "QB":
        return stats["passing"]["yds"]
    if position == "RB":
        return stats["rushing"]["yds"]
    if position in ("WR", "TE"):
        return stats["receiving"]["yds"]
    if position in ("DL", "LB", "DB"):
        return stats["defense"]["tackles"]
    if position in ("K", "P"):
        return stats["kicking"]["fgm"] + stats["kicking"]["xpm"]
    return 0


def dedupe_players(players: list[dict]) -> list[dict]:
    """Merge roster rows that list the same player twice (two units/jerseys).

    Keeps the entry whose position is best supported by the player's stats,
    backfilling height/weight from the discarded duplicate.
    """
    groups: dict[tuple[str, str], list[dict]] = {}
    for player in players:
        key = (player["teamId"], normalize_name(player["name"]))
        groups.setdefault(key, []).append(player)

    out: list[dict] = []
    for group in groups.values():
        if len(group) == 1:
            out.append(group[0])
            continue
        best = max(
            group,
            key=lambda p: (
                _position_stat(p, p["position"]),
                p.get("height") is not None,
                p.get("weight") is not None,
            ),
        )
        merged = {**best}
        for player in group:
            if merged.get("height") is None and player.get("height"):
                merged["height"] = player["height"]
            if merged.get("weight") is None and player.get("weight"):
                merged["weight"] = player["weight"]
        out.append(merged)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", default="2025-26", help="e.g. 2026-27")
    args = parser.parse_args()

    season: str = args.season
    fragment = season_fragment(season)
    data_dir = ROOT / "output" / "data" / season
    report_path = ROOT / "output" / f"enrich-report-{season}.md"

    teams = json.loads((data_dir / "teams.json").read_text(encoding="utf-8"))
    players = json.loads((data_dir / "players.json").read_text(encoding="utf-8"))
    cache = CrawlCache(CACHE_PATH)

    client = httpx.Client(
        headers={"User-Agent": USER_AGENT}, timeout=30, follow_redirects=True
    )

    print(f"Season {season}: {len(teams)} teams, {len(players)} players", flush=True)
    print_urls = extract_print_urls(client, cache, teams, fragment)
    print(f"Print URLs resolved: {len(print_urls)}/{len(teams)}", flush=True)

    players_by_team: dict[str, list[dict]] = {}
    for player in players:
        players_by_team.setdefault(player["teamId"], []).append(player)

    matched = 0
    unmatched_athletes: list[str] = []
    all_stat_classes: set[str] = set()
    enriched_players: list[dict] = []
    enriched_teams: list[dict] = []
    teams_done = 0

    for team in teams:
        team_id = team["id"]
        roster = players_by_team.get(team_id, [])
        url = print_urls.get(team_id)
        new_team = {**team}

        if url is None:
            print(f"NO PRINT URL: {team_id}", flush=True)
            enriched_players.extend(roster)
            enriched_teams.append(new_team)
            continue

        html = fetch_page(client, cache, url)
        if html is None:
            enriched_players.extend(roster)
            enriched_teams.append(new_team)
            continue

        athletes, totals = parse_print_page(html)
        for entry in athletes.values():
            all_stat_classes.update(entry["stats"].keys())

        # Join: normalized full name, fallback jersey + last name.
        by_name = dict(athletes)
        by_jersey_last: dict[str, dict] = {}
        for entry in athletes.values():
            last = normalize_name(entry["name"]).split()[-1] if entry["name"] else ""
            if entry["jersey"]:
                by_jersey_last[f"{entry['jersey']}|{last}"] = entry

        claimed: set[int] = set()
        for player in roster:
            key = normalize_name(player["name"])
            entry = by_name.get(key)
            if entry is None:
                last = key.split()[-1] if key else ""
                entry = by_jersey_last.get(f"{player.get('jersey','')}|{last}")
            if entry is None:
                enriched_players.append(player)
                continue
            claimed.add(id(entry))
            matched += 1
            flat = entry["stats"]
            enriched_players.append(
                {
                    **player,
                    "stats": build_player_stats(flat),
                    "gamesPlayed": int(flat.get("gamesplayed", 0) or 0),
                }
            )

        for entry in athletes.values():
            if id(entry) not in claimed:
                unmatched_athletes.append(f"{team_id}: {entry['name']}")

        team_stats = {**team.get("stats", {})}
        team_stats["yardsFor"] = int(totals.get("totalyards", 0) or 0)
        team_stats["passYdsFor"] = int(totals.get("passingyards", 0) or 0)
        team_stats["rushYdsFor"] = int(totals.get("rushingyards", 0) or 0)
        team_stats["turnoversForced"] = int(
            (totals.get("ints", 0) or 0) + (totals.get("fumblerecoveries", 0) or 0)
        )
        team_stats["turnoversLost"] = int(
            (totals.get("passingint", 0) or 0)
            + (totals.get("offensivefumbleslost", 0) or 0)
        )
        new_team["stats"] = team_stats
        enriched_teams.append(new_team)

        teams_done += 1
        if teams_done % 10 == 0:
            print(f"  {teams_done} teams processed...", flush=True)

    client.close()

    before = len(enriched_players)
    enriched_players = dedupe_players(enriched_players)
    print(f"Deduped {before - len(enriched_players)} duplicate roster rows.", flush=True)

    (data_dir / "players.json").write_text(
        json.dumps(enriched_players, indent=2), encoding="utf-8"
    )
    (data_dir / "teams.json").write_text(
        json.dumps(enriched_teams, indent=2), encoding="utf-8"
    )

    report = [
        f"# Print-stats enrichment report — {season}",
        "",
        f"- Teams with print URL: {len(print_urls)}/{len(teams)}",
        f"- Roster players matched to print stats: {matched}/{len(players)}",
        f"- Print athletes with no roster match: {len(unmatched_athletes)}",
        "",
        "## Distinct stat classes seen",
        "",
        ", ".join(sorted(all_stat_classes)),
        "",
        "## Unmatched print athletes (stats dropped)",
        "",
        *[f"- {line}" for line in unmatched_athletes[:200]],
    ]
    report_path.write_text("\n".join(report), encoding="utf-8")
    print(f"DONE. Matched {matched}/{len(players)} players.", flush=True)
    print(f"Report: {report_path}", flush=True)


if __name__ == "__main__":
    main()
