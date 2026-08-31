"""Audit head coaches: live MaxPreps vs AFHS history vs the shipped dataset.

Read-only. Writes a report and never touches teams.json or afhs-coaches.json —
neither source is trustworthy on its own, so the disagreements need a human
call before anything is overwritten:

  * AFHS lags real coaching changes. It still had John Carr at Starkville a
    season after Brett Morgan took the job.
  * MaxPreps invents names. Brandon confirmed "Ayden Collier" was fabricated
    where AFHS correctly had Eugene Clinton.

Categorising the mismatches is the point: a spelling variant is noise, a name
that shares no surname with either source is a real disagreement worth a look.

    scraper/.venv/Scripts/python scraper/scripts/audit_coaches.py [--limit N]
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper" / "src"))

from scraper import config  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.team_page import parse_team_home  # noqa: E402

DATA = ROOT / "web" / "public" / "data"
TEAMS = DATA / "2026-27" / "teams.json"
COACHES = DATA / "history" / "afhs-coaches.json"
TEAM_MAP = DATA / "history" / "afhs-team-map.json"
OUT_JSON = ROOT / "docs" / "coach-audit.json"
OUT_MD = ROOT / "docs" / "coach-audit.md"


def norm(name: str | None) -> str:
    """Lowercase, strip punctuation and suffixes so 'M.D.' == 'MD'."""
    if not name:
        return ""
    s = re.sub(r"[.,']", "", name.lower())
    s = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", s)
    return " ".join(s.split())


def surname(name: str | None) -> str:
    parts = norm(name).split()
    return parts[-1] if parts else ""


def classify(afhs: str | None, live: str | None) -> str:
    """Bucket a mismatch by how likely it is to be a real coaching change."""
    if not live:
        return "no-maxpreps-name"
    if not afhs:
        return "no-afhs-history"
    if norm(afhs) == "vacant":
        return "afhs-vacant"
    if norm(afhs) == norm(live):
        return "agree"
    # Same surname => almost always a spelling or first-name variant
    # (Chris/Christopher Daniels), not a different person.
    if surname(afhs) == surname(live):
        return "spelling-variant"
    return "different-person"


async def fetch(harness: BrowserHarness, cache: CrawlCache, url: str) -> str | None:
    hit = cache.get(url)
    if hit:
        return hit.body
    try:
        async with harness.page() as page:
            await page.goto(url, wait_until="domcontentloaded")
            with contextlib.suppress(Exception):
                await page.wait_for_load_state("networkidle", timeout=10_000)
            html = await page.content()
    except Exception as exc:  # keep going; one dead page must not kill the run
        print(f"  !! fetch failed {url}: {exc}", flush=True)
        return None
    cache.put(url, body=html, status=200)
    await harness.jitter()
    return html


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="only first N teams")
    args = ap.parse_args()

    teams: list[dict[str, Any]] = json.loads(TEAMS.read_text(encoding="utf-8"))
    coaches = json.loads(COACHES.read_text(encoding="utf-8"))
    tmap = json.loads(TEAM_MAP.read_text(encoding="utf-8"))
    afhs = {r["team"]: r.get("currentCoach") for r in coaches}

    if args.limit:
        teams = teams[: args.limit]

    cache = CrawlCache(config.CACHE_DB_PATH)
    rows: list[dict[str, Any]] = []

    async with BrowserHarness(headless=True) as harness:
        for i, t in enumerate(teams, 1):
            url = t.get("maxprepsUrl")
            live = None
            if url:
                html = await fetch(harness, cache, url)
                if html:
                    with contextlib.suppress(Exception):
                        live = parse_team_home(html, source_url=url).get("headCoach")

            school = tmap.get(t["id"])
            rows.append(
                {
                    "id": t["id"],
                    "name": t.get("name"),
                    "school": school,
                    "afhs": afhs.get(school) if school else None,
                    "dataset": t.get("headCoach"),
                    "maxprepsLive": live,
                    "category": classify(afhs.get(school) if school else None, live),
                    "datasetStale": bool(live and norm(live) != norm(t.get("headCoach"))),
                }
            )
            print(f"[{i}/{len(teams)}] {t.get('name')}: {live}", flush=True)

    OUT_JSON.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    order = [
        "different-person",
        "afhs-vacant",
        "no-afhs-history",
        "spelling-variant",
        "no-maxpreps-name",
        "agree",
    ]
    buckets: dict[str, list[dict[str, Any]]] = {k: [] for k in order}
    for r in rows:
        buckets[r["category"]].append(r)

    lines = ["# Coach audit — live MaxPreps vs AFHS vs dataset", ""]
    lines.append(f"{len(rows)} teams checked.")
    lines.append("")
    for k in order:
        lines.append(f"- **{k}**: {len(buckets[k])}")
    lines.append("")
    for k in order:
        if k == "agree" or not buckets[k]:
            continue
        lines.append(f"## {k} ({len(buckets[k])})")
        lines.append("")
        lines.append("| Team | AFHS | Dataset | MaxPreps (live) |")
        lines.append("| --- | --- | --- | --- |")
        for r in sorted(buckets[k], key=lambda x: x["name"] or ""):
            lines.append(
                f"| {r['name']} | {r['afhs'] or '—'} | {r['dataset'] or '—'} "
                f"| {r['maxprepsLive'] or '—'} |"
            )
        lines.append("")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    stale = sum(1 for r in rows if r["datasetStale"])
    print(f"\nwrote {OUT_MD}")
    for k in order:
        print(f"  {k}: {len(buckets[k])}")
    print(f"  dataset stale vs live: {stale}")


if __name__ == "__main__":
    asyncio.run(main())
