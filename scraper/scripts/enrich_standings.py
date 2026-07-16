"""Add official region records to teams.json from cached MaxPreps team pages.

Each cached schedule page's __NEXT_DATA__ carries
teamContext.standingsData.leagueStanding.conferenceWinLossTies ("2-3"),
the official district/region record. Teams are joined by the same
name+mascot slug the pipeline uses for team ids. The league name is
checked against the team's district as a sanity guard.

Usage:
    .venv/Scripts/python scripts/enrich_standings.py [extra_teams_json ...]

Patches scraper/output/data/2025-26/teams.json plus any extra teams.json
paths passed as arguments (e.g. the web/public copy).
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from scraper.nextdata import (  # noqa: E402
    extract_overall_standing,
    extract_region_record,
)

SEASON = "2025-26"
SEASON_URL_FRAGMENT = "25-26"
DEFAULT_TEAMS_JSON = ROOT / "output" / "data" / SEASON / "teams.json"
CACHE_PATH = ROOT / ".cache" / "crawl.db"

NEXT_DATA_RE = re.compile(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)


def collect_region_records() -> dict[str, dict]:
    """team base URL -> {record: {wins, losses}, league: str} from cached pages.

    The cached schedule URL is exactly `<teams.json maxprepsUrl>25-26/schedule`,
    so the base URL is a reliable join key.
    """
    db = sqlite3.connect(CACHE_PATH)
    cur = db.execute(
        "SELECT url, body FROM responses WHERE url LIKE ?",
        [f"%{SEASON_URL_FRAGMENT}/schedule%"],
    )
    found: dict[str, dict] = {}
    pages = 0
    for url, body in cur:
        m = NEXT_DATA_RE.search(body)
        if not m:
            continue
        try:
            payload = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        pages += 1
        record = extract_region_record(payload)
        overall = extract_overall_standing(payload)
        if record is None and overall is None:
            continue
        league = (
            (
                payload["props"]["pageProps"]["teamContext"]
                .get("standingsData", {})
                .get("leagueStanding", {})
                or {}
            ).get("leagueName", "")
        )
        base = re.sub(rf"{SEASON_URL_FRAGMENT}/schedule/?$", "", url)
        found[base] = {"record": record, "league": league, "overall": overall}
    print(f"cache pages scanned: {pages}, region records found: {len(found)}")
    return found


def patch_teams_json(path: Path, records: dict[str, dict]) -> None:
    teams = json.loads(path.read_text(encoding="utf-8"))
    patched = 0
    mismatched = 0
    for t in teams:
        hit = records.get(t.get("maxprepsUrl") or "")
        if hit is None:
            t.setdefault("regionRecord", None)
            continue
        if hit["league"] and t.get("district") and hit["league"] != t["district"]:
            print(f"  league mismatch for {t['id']}: {hit['league']!r} vs {t['district']!r}")
            mismatched += 1
        t["regionRecord"] = hit["record"]
        overall = hit.get("overall") or {}
        for key in ("homeRecord", "awayRecord", "neutralRecord", "streak"):
            t[key] = overall.get(key)
        patched += 1
    path.write_text(json.dumps(teams, indent=2), encoding="utf-8")
    print(f"{path}: {patched}/{len(teams)} teams patched, {mismatched} league mismatches")


def main() -> None:
    records = collect_region_records()
    targets = [DEFAULT_TEAMS_JSON, *(Path(p) for p in sys.argv[1:])]
    for target in targets:
        if target.exists():
            patch_teams_json(target, records)
        else:
            print(f"skip missing {target}")


if __name__ == "__main__":
    main()
