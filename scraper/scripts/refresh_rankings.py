"""Refresh each team's MaxPreps rankings for a season.

The site displays MaxPreps' own ranks — statewide overall and per-division —
so they have to be re-pulled as MaxPreps republishes them through the season.
Only the `rankings` block of teams.json is touched; records, colours, stats and
everything else are left exactly as they are.

Both copies are updated: the scraper's own output and the served copy under
web/public, which carries crest colours the scraper output does not have.

Usage:
    .venv/Scripts/python scripts/refresh_rankings.py --season 2026-27
    .venv/Scripts/python scripts/refresh_rankings.py --season 2026-27 --fresh
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

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))

from scraper.cache import CrawlCache  # noqa: E402

CACHE_PATH = ROOT / ".cache" / "crawl.db"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
FETCH_DELAY_SECONDS = 0.6

NEXT_DATA_RE = re.compile(
    r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S
)

# rankingType: 0 national, 1 state overall, 4 state division/class, 6 DMA/metro
# (deliberately ignored — "Columbus-Tupelo" is a media market, not a state rank).
RANK_TYPES = {0: "national", 1: "stateOverall", 4: "stateClass"}


def find_key(obj: Any, key: str, depth: int = 0) -> Any:
    """First value for `key` anywhere in a nested payload, or None."""
    if depth > 8:
        return None
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for value in obj.values():
            found = find_key(value, key, depth + 1)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for value in obj:
            found = find_key(value, key, depth + 1)
            if found is not None:
                return found
    return None


def parse_rankings(html: str) -> dict[str, int | None] | None:
    """The three ranks off a team home page, or None if the page has none."""
    match = NEXT_DATA_RE.search(html)
    if not match:
        return None
    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    data = find_key(payload, "rankingsData")
    if not isinstance(data, dict):
        return None
    out: dict[str, int | None] = {
        "stateOverall": None, "stateClass": None, "national": None,
    }
    for entry in data.get("data") or []:
        field = RANK_TYPES.get(entry.get("rankingType"))
        if field:
            out[field] = entry.get("rank")
    return out


def fetch(client: httpx.Client, cache: CrawlCache, url: str, fresh: bool) -> str | None:
    """Team home page, from cache unless --fresh forces a re-fetch.

    Ranks go stale weekly, so a cached hit is the wrong default when the point
    of the run is to pick up MaxPreps' new list.
    """
    if not fresh:
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", default="2026-27")
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="re-fetch every page instead of reusing the crawl cache",
    )
    args = parser.parse_args()
    season: str = args.season

    targets = [
        ROOT / "output" / "data" / season / "teams.json",
        REPO / "web" / "public" / "data" / season / "teams.json",
    ]
    present = [p for p in targets if p.exists()]
    if not present:
        raise SystemExit(f"No teams.json found for {season}")

    # Ranks are keyed off the scraper copy; both files hold the same team ids.
    teams = json.loads(present[0].read_text(encoding="utf-8"))
    cache = CrawlCache(CACHE_PATH)
    client = httpx.Client(
        headers={"User-Agent": USER_AGENT}, timeout=30, follow_redirects=True
    )

    ranks: dict[str, dict[str, int | None]] = {}
    ranked = 0
    for i, team in enumerate(teams, 1):
        url = (team.get("maxprepsUrl") or "").strip()
        if not url:
            print(f"NO URL: {team['id']}", flush=True)
            continue
        html = fetch(client, cache, url, args.fresh)
        if html is None:
            continue
        parsed = parse_rankings(html)
        if parsed is None:
            continue
        ranks[team["id"]] = parsed
        if parsed["stateOverall"] is not None or parsed["stateClass"] is not None:
            ranked += 1
        if i % 25 == 0:
            print(f"  {i}/{len(teams)} teams...", flush=True)
    client.close()

    for path in present:
        rows = json.loads(path.read_text(encoding="utf-8"))
        for row in rows:
            found = ranks.get(row["id"])
            if found is not None:
                row["rankings"] = found
        path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {path}", flush=True)

    print(f"DONE. {ranked}/{len(teams)} teams carry a MaxPreps rank.", flush=True)


if __name__ == "__main__":
    main()
