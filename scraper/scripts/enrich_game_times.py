"""Add kickoff times to games.json from cached MaxPreps schedule pages.

games.json ships date-only ("2025-08-22"), but the schedule payloads carry a
full contest datetime ("2025-08-22T18:00:00"). Each contest entry also holds
the boxscore URL whose ?c= parameter matches the game's maxprepsUrl, giving a
reliable join key. The datetime is validated against the date embedded in the
boxscore URL (".../08-22-2025/...") before use; midnight times are treated as
TBD and left date-only.

Usage:
    .venv/Scripts/python scripts/enrich_game_times.py
"""

from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEASON = "2025-26"
SEASON_URL_FRAGMENT = "25-26"
DATA_DIR = ROOT / "output" / "data" / SEASON
CACHE_PATH = ROOT / ".cache" / "crawl.db"

NEXT_DATA_RE = re.compile(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)
DATETIME_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}$")
BOX_URL_RE = re.compile(r"/games/(\d{2})-(\d{2})-(\d{4})/.*[?&]c=([\w-]+)")


def walk_strings(node: object) -> list[str]:
    """Flatten every string in a nested list structure (one contest entry)."""
    out: list[str] = []
    if isinstance(node, str):
        out.append(node)
    elif isinstance(node, list):
        for item in node:
            out.extend(walk_strings(item))
    return out


def extract_contest_times(payload: dict) -> dict[str, str]:
    """Map boxscore c= contest key -> 'YYYY-MM-DDTHH:MM' kickoff."""
    contests = payload.get("props", {}).get("pageProps", {}).get("contests") or []
    result: dict[str, str] = {}
    for contest in contests:
        strings = walk_strings(contest)
        box = None
        for s in strings:
            m = BOX_URL_RE.search(s)
            if m:
                box = m
                break
        if box is None:
            continue
        month, day, year, contest_key = box.groups()
        url_date = f"{year}-{month}-{day}"
        for s in strings:
            dt = DATETIME_RE.match(s)
            if dt and s.startswith(url_date):
                hh, mm = dt.group(4), dt.group(5)
                if not (hh == "00" and mm == "00"):
                    result[contest_key] = f"{url_date}T{hh}:{mm}"
                break
    return result


def main() -> None:
    games = json.loads((DATA_DIR / "games.json").read_text(encoding="utf-8"))

    db = sqlite3.connect(CACHE_PATH)
    cur = db.execute(
        "SELECT url, body FROM responses WHERE url LIKE ?",
        [f"%{SEASON_URL_FRAGMENT}/schedule%"],
    )
    times_by_key: dict[str, str] = {}
    pages = 0
    for _url, body in cur:
        m = NEXT_DATA_RE.search(body)
        if not m:
            continue
        try:
            payload = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        times_by_key.update(extract_contest_times(payload))
        pages += 1
    print(f"Parsed {pages} schedule pages, {len(times_by_key)} contest kickoffs found.")

    updated = 0
    enriched: list[dict] = []
    for game in games:
        url = game.get("maxprepsUrl") or ""
        key_match = re.search(r"[?&]c=([\w-]+)", url)
        kickoff = times_by_key.get(key_match.group(1)) if key_match else None
        if kickoff and kickoff.startswith(game["date"]):
            enriched.append({**game, "date": kickoff})
            updated += 1
        else:
            enriched.append(game)

    (DATA_DIR / "games.json").write_text(json.dumps(enriched, indent=2), encoding="utf-8")
    print(f"Updated {updated}/{len(games)} games with kickoff times.")


if __name__ == "__main__":
    main()
