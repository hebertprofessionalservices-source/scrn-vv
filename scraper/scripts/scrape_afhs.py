"""Crawl ahsfhs.org/mississippi for historical games + coach records.

Fetches every matched team's coach history and season-by-season game logs.
Fully resumable: every fetched page is cached on disk and outputs are
checkpointed after each team, so re-running skips completed work.

Usage:
    .venv/Scripts/python scripts/scrape_afhs.py [--limit N]

Outputs (scraper/output/afhs/):
    afhs-games.json     one record per (team, season, game)
    afhs-coaches.json   coach stints per team + current coach
    afhs-team-map.json  our teamId -> AFHS school name
"""

from __future__ import annotations

import argparse
import json
import re
import string
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper.afhs import (  # noqa: E402
    BASE,
    parse_coaches,
    parse_season_games,
    parse_team_directory,
    parse_year_list,
)

CACHE_DIR = ROOT / ".cache" / "afhs"
OUT_DIR = ROOT / "output" / "afhs"
TEAMS_JSON = ROOT / "output" / "data" / "2025-26" / "teams.json"
DELAY_SECONDS = 0.45
MIN_YEAR = 1920

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    )
}

_last_fetch = 0.0


def fetch(client: httpx.Client, url: str) -> str | None:
    """Disk-cached polite GET; returns None on persistent failure."""
    global _last_fetch
    key = re.sub(r"[^A-Za-z0-9]+", "_", url.split("/Teams/")[-1])[:150] + ".html"
    cached = CACHE_DIR / key
    if cached.exists():
        return cached.read_text(encoding="utf-8", errors="ignore")

    wait = DELAY_SECONDS - (time.monotonic() - _last_fetch)
    if wait > 0:
        time.sleep(wait)
    for attempt in range(3):
        try:
            _last_fetch = time.monotonic()
            resp = client.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                cached.write_text(resp.text, encoding="utf-8")
                return resp.text
            if resp.status_code in (403, 429, 503):
                time.sleep(10 * (attempt + 1))
                continue
            return None
        except httpx.HTTPError:
            time.sleep(5 * (attempt + 1))
    return None


def norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def school_name(team: dict) -> str:
    """Our team name minus its mascot suffix ('Oxford Chargers' -> 'Oxford')."""
    name = team["name"]
    mascot = team.get("mascot")
    if mascot and name.lower().endswith(mascot.lower()):
        name = name[: len(name) - len(mascot)]
    return name.strip()


# Known naming differences between MaxPreps and AFHS.
MANUAL_ALIASES = {
    "madisonridgelandacademy": "mra",
    "presbyterianchristian": "presbyterianchristianschool",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="cap matched teams (smoke run)")
    args = parser.parse_args()

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    our_teams = json.loads(TEAMS_JSON.read_text(encoding="utf-8"))
    client = httpx.Client(follow_redirects=True)

    # 1. Directory: AFHS school names A-Z.
    afhs_names: list[str] = []
    for letter in string.ascii_uppercase:
        html = fetch(client, f"{BASE}/findateamabc.asp?abc={letter}")
        if html:
            afhs_names.extend(parse_team_directory(html))
    print(f"AFHS directory: {len(afhs_names)} schools", flush=True)

    by_norm = {norm(n): n for n in afhs_names}
    team_map: dict[str, str] = {}
    for t in our_teams:
        key = norm(school_name(t))
        key = MANUAL_ALIASES.get(key, key)
        hit = by_norm.get(key)
        if hit:
            team_map[t["id"]] = hit
    print(f"matched {len(team_map)}/{len(our_teams)} teams", flush=True)
    (OUT_DIR / "afhs-team-map.json").write_text(
        json.dumps(team_map, indent=2), encoding="utf-8"
    )

    # 2. Per matched school: coaches + season logs (dedupe repeated names).
    schools = sorted(set(team_map.values()))
    if args.limit:
        schools = schools[: args.limit]

    games_path = OUT_DIR / "afhs-games.json"
    coaches_path = OUT_DIR / "afhs-coaches.json"
    done_path = OUT_DIR / "_afhs_done.txt"
    def load_list(path: Path) -> list[dict]:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []

    games: list[dict] = load_list(games_path)
    coaches: list[dict] = load_list(coaches_path)
    done = set(done_path.read_text(encoding="utf-8").splitlines()) if done_path.exists() else set()

    for idx, school in enumerate(schools):
        if school in done:
            continue
        q = school.replace(" ", "%20")

        coaches_html = fetch(client, f"{BASE}/Coaches.asp?Team={q}")
        if coaches_html:
            coaches.append(parse_coaches(coaches_html, team=school))

        first = fetch(client, f"{BASE}/gamesbyyear.asp?p=1&Year=2025&Team={q}&Show1=1")
        years = [y for y in parse_year_list(first or "") if y >= MIN_YEAR]
        school_games: list[dict] = []
        for year in years:
            html = fetch(client, f"{BASE}/gamesbyyear.asp?p=1&Year={year}&Team={q}&Show1=1")
            if html:
                school_games.extend(parse_season_games(html, team=school, year=year))
        games.extend(school_games)

        done.add(school)
        games_path.write_text(json.dumps(games), encoding="utf-8")
        coaches_path.write_text(json.dumps(coaches), encoding="utf-8")
        with done_path.open("a", encoding="utf-8") as fh:
            fh.write(school + "\n")
        print(
            f"[{idx + 1}/{len(schools)}] {school}: {len(years)} seasons, "
            f"{len(school_games)} games",
            flush=True,
        )

    print(f"DONE: {len(games)} games, {len(coaches)} coach pages", flush=True)


if __name__ == "__main__":
    main()
