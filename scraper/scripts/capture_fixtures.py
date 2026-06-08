"""Capture HTML fixtures for parser tests.

Usage:
    python scripts/capture_fixtures.py

Captures one representative page of each type into tests/fixtures/.
Re-run any time MaxPreps DOM changes meaningfully.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from scraper.browser import BrowserHarness  # noqa: E402

FIXTURES = PROJECT_ROOT / "tests" / "fixtures"

# URLs discovered by discover_and_capture.py — update when pages change.
# team_schedule / team_stats use the 25-26 season so they contain actual completed games.
TARGETS: dict[str, str] = {
    "ms_football_landing.html": (
        "https://www.maxpreps.com/ms/football/"
    ),
    "class_7a_directory.html": (
        "https://www.maxpreps.com/ms/football/26-27/class/class-7a/"
        "?statedivisionid=86401710-9915-4a02-8f4e-0d905a356dce"
    ),
    "team_home.html": (
        "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/"
    ),
    "team_roster.html": (
        "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/roster/"
    ),
    "team_schedule.html": (
        "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/25-26/schedule/"
    ),
    "team_stats.html": (
        "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/25-26/stats/"
    ),
    "boxscore_complete.html": (
        "https://www.maxpreps.com/games/08-29-2025/football-25/"
        "oak-grove-vs-starkville.htm?c=GbcX724Q30WON6REOKFZxQ"
    ),
    "boxscore_missing.html": (
        "https://www.maxpreps.com/games/09-11-2026/football-26/"
        "ashland-vs-byhalia.htm?c=vjFO3GAoFkuZvV2CuDaWXg"
    ),
}


async def _accept_cookies(page) -> None:
    """Try to dismiss cookie / GDPR banners."""
    selectors = [
        'button:has-text("Accept All")',
        'button:has-text("Accept")',
        'button:has-text("I Accept")',
        'button:has-text("OK")',
        '[id*="onetrust-accept"]',
    ]
    for sel in selectors:
        try:
            await page.click(sel, timeout=2_000)
            await page.wait_for_timeout(1_000)
            return
        except Exception:
            pass


async def main() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    async with BrowserHarness(headless=True) as h:
        for filename, url in TARGETS.items():
            if url == "FILL_IN":
                print(f"SKIP {filename} — URL not set")
                continue
            print(f"GET  {url}")
            async with h.page() as p:
                try:
                    await p.goto(url, wait_until="networkidle", timeout=60_000)
                except Exception:
                    await p.goto(url, wait_until="domcontentloaded", timeout=60_000)
                    await p.wait_for_timeout(5_000)
                await _accept_cookies(p)
                html = await p.content()
                (FIXTURES / filename).write_text(html, encoding="utf-8")
                print(f"WROTE {filename} ({len(html):,} bytes)")
                await h.jitter()


if __name__ == "__main__":
    asyncio.run(main())
