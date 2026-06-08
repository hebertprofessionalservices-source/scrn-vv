"""Discover MaxPreps URLs and capture all 8 HTML fixtures in one session.

Usage:
    python scripts/discover_and_capture.py

After running, update the TARGETS dict in scripts/capture_fixtures.py
with the URLs printed at the end of this script.
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from scraper.browser import BrowserHarness  # noqa: E402

FIXTURES = PROJECT_ROOT / "tests" / "fixtures"
FIXTURES.mkdir(parents=True, exist_ok=True)

LANDING_URL = "https://www.maxpreps.com/mississippi/football/"


async def _accept_cookies(page) -> None:
    """Try to dismiss cookie / GDPR banners."""
    selectors = [
        'button:has-text("Accept All")',
        'button:has-text("Accept")',
        'button:has-text("I Accept")',
        'button:has-text("OK")',
        '[id*="onetrust-accept"]',
        '[class*="accept"]',
    ]
    for sel in selectors:
        try:
            await page.click(sel, timeout=2_000)
            await page.wait_for_timeout(1_000)
            return
        except Exception:
            pass


async def _safe_goto(page, url: str, *, timeout: int = 60_000) -> None:
    """Navigate with networkidle fallback to domcontentloaded."""
    try:
        await page.goto(url, wait_until="networkidle", timeout=timeout)
    except Exception:
        print(f"  networkidle timeout, retrying with domcontentloaded: {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        await page.wait_for_timeout(5_000)
    await _accept_cookies(page)


def _save(filename: str, html: str) -> None:
    path = FIXTURES / filename
    path.write_text(html, encoding="utf-8")
    print(f"  WROTE {filename} ({len(html):,} bytes)")


def _extract_links(html: str, pattern: str) -> list[str]:
    """Return unique hrefs matching a regex pattern."""
    seen: set[str] = set()
    out: list[str] = []
    for m in re.finditer(r'href=["\']([^"\']+)["\']', html):
        href = m.group(1)
        if re.search(pattern, href, re.IGNORECASE) and href not in seen:
            seen.add(href)
            out.append(href)
    return out


def _abs(href: str) -> str:
    if href.startswith("http"):
        return href
    return "https://www.maxpreps.com" + href


async def main() -> None:
    captured_urls: dict[str, str] = {}

    async with BrowserHarness(headless=True) as h:
        # ── Step 1: Landing page ──────────────────────────────────────────
        print(f"\n[1/8] Landing page: {LANDING_URL}")
        async with h.page() as p:
            await _safe_goto(p, LANDING_URL)
            html = await p.content()
            _save("ms_football_landing.html", html)
            captured_urls["ms_football_landing.html"] = LANDING_URL
            landing_html = html
        await h.jitter()

        # ── Step 2: Class 7A directory ────────────────────────────────────
        class_links = _extract_links(landing_html, r"/(classification|division|class)/")
        # Also try statewide links that have "7a" or "7-a" in them
        seven_a_links = [
            lnk for lnk in class_links if re.search(r"7.?a", lnk, re.IGNORECASE)
        ]

        if not seven_a_links:
            # Fallback: look for links with "7a" anywhere in landing page
            pat_7a = r'href=["\']([^"\']*7.?a[^"\']*football[^"\']*)["\']'
            all_7a = re.findall(pat_7a, landing_html, re.IGNORECASE)
            seven_a_links = list(dict.fromkeys(all_7a))

        if not seven_a_links:
            # Generic fallback — pick first classification link
            seven_a_links = class_links[:1]

        class_7a_url = _abs(seven_a_links[0]) if seven_a_links else None
        print(f"\n[2/8] Class 7A directory: {class_7a_url}")

        class_7a_html = ""
        if class_7a_url:
            async with h.page() as p:
                await _safe_goto(p, class_7a_url)
                class_7a_html = await p.content()
                _save("class_7a_directory.html", class_7a_html)
                captured_urls["class_7a_directory.html"] = class_7a_url
            await h.jitter()
        else:
            print("  WARN: could not discover 7A directory URL")

        # ── Step 3: Team home page ────────────────────────────────────────
        team_links = _extract_links(class_7a_html, r"/high-schools/.*?/football/")
        # Prefer Starkville
        starkville = [lnk for lnk in team_links if "starkville" in lnk.lower()]
        chosen_team_href = starkville[0] if starkville else (team_links[0] if team_links else None)

        # Strip trailing path segments so we get the team home
        team_base_url: str | None = None
        if chosen_team_href:
            abs_href = _abs(chosen_team_href)
            # Normalize: keep up through the sport segment
            m = re.match(r"(https://www\.maxpreps\.com/high-schools/[^/]+/football/?)", abs_href)
            team_base_url = m.group(1).rstrip("/") + "/" if m else abs_href

        print(f"\n[3/8] Team home: {team_base_url}")
        team_home_html = ""
        if team_base_url:
            async with h.page() as p:
                await _safe_goto(p, team_base_url)
                team_home_html = await p.content()
                _save("team_home.html", team_home_html)
                captured_urls["team_home.html"] = team_base_url
            await h.jitter()
        else:
            print("  WARN: could not discover team URL from 7A directory")

        # ── Step 4: Roster / Schedule / Stats ─────────────────────────────
        for slug, fixture in [
            ("roster", "team_roster.html"),
            ("schedule", "team_schedule.html"),
            ("stats", "team_stats.html"),
        ]:
            sub_url = f"{team_base_url}{slug}/" if team_base_url else None
            print(f"\n[{4 + ['roster', 'schedule', 'stats'].index(slug)}/8] {fixture}: {sub_url}")
            if sub_url:
                async with h.page() as p:
                    await _safe_goto(p, sub_url)
                    html = await p.content()
                    _save(fixture, html)
                    captured_urls[fixture] = sub_url
                await h.jitter()
            else:
                print(f"  SKIP {fixture} — no team base URL")

        # ── Step 5: Box score (complete) ──────────────────────────────────
        sched_path = FIXTURES / "team_schedule.html"
        schedule_html = sched_path.read_text(encoding="utf-8") if sched_path.exists() else ""
        # Find links that look like game / score pages
        score_links = _extract_links(schedule_html, r"/(scores?|game|boxscore)/")
        boxscore_url: str | None = None
        if score_links:
            boxscore_url = _abs(score_links[0])
        else:
            # Fallback: look for any /games/ link in the schedule page
            game_links = _extract_links(schedule_html, r"/game")
            boxscore_url = _abs(game_links[0]) if game_links else None

        print(f"\n[7/8] Boxscore (complete): {boxscore_url}")
        if boxscore_url:
            async with h.page() as p:
                await _safe_goto(p, boxscore_url)
                html = await p.content()
                _save("boxscore_complete.html", html)
                captured_urls["boxscore_complete.html"] = boxscore_url
            await h.jitter()
        else:
            print("  WARN: could not find boxscore link in schedule page")

        # ── Step 6: Box score (missing / small school) ────────────────────
        # Re-derive a 1A or 2A directory from the landing page
        small_class_links = [
            lnk for lnk in class_links if re.search(r"[12].?a", lnk, re.IGNORECASE)
        ]
        small_class_url = _abs(small_class_links[0]) if small_class_links else None

        print(f"\n[8/8] Boxscore (missing/small school): finding via {small_class_url}")
        boxscore_missing_html = ""
        boxscore_missing_url: str | None = None

        if small_class_url:
            async with h.page() as p:
                await _safe_goto(p, small_class_url)
                small_dir_html = await p.content()
                _save("class_1a_directory.html", small_dir_html)
            await h.jitter()

            small_team_links = _extract_links(small_dir_html, r"/high-schools/.*?/football/")
            small_team_href = small_team_links[0] if small_team_links else None
            if small_team_href:
                small_team_base = _abs(small_team_href)
                hs_pat = r"(https://www\.maxpreps\.com/high-schools/[^/]+/football/?)"
                m2 = re.match(hs_pat, small_team_base)
                small_team_base = m2.group(1).rstrip("/") + "/" if m2 else small_team_base
                small_schedule_url = f"{small_team_base}schedule/"

                async with h.page() as p:
                    await _safe_goto(p, small_schedule_url)
                    small_sched_html = await p.content()
                await h.jitter()

                small_score_links = _extract_links(small_sched_html, r"/(scores?|game|boxscore)/")
                if small_score_links:
                    boxscore_missing_url = _abs(small_score_links[0])
                    async with h.page() as p:
                        await _safe_goto(p, boxscore_missing_url)
                        boxscore_missing_html = await p.content()
                        _save("boxscore_missing.html", boxscore_missing_html)
                        captured_urls["boxscore_missing.html"] = boxscore_missing_url
                    await h.jitter()

        if not boxscore_missing_url:
            print("  FALLBACK: using second game from 7A team schedule for boxscore_missing")
            if len(score_links) > 1:
                boxscore_missing_url = _abs(score_links[1])
            elif score_links:
                boxscore_missing_url = _abs(score_links[0])

            if boxscore_missing_url:
                async with h.page() as p:
                    await _safe_goto(p, boxscore_missing_url)
                    html = await p.content()
                    _save("boxscore_missing.html", html)
                    captured_urls["boxscore_missing.html"] = boxscore_missing_url
                await h.jitter()
            else:
                print("  WARN: could not capture boxscore_missing.html")

    # ── Summary ────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("CAPTURED URLS (copy into capture_fixtures.py TARGETS):")
    print("=" * 60)
    for filename, url in captured_urls.items():
        print(f'    "{filename}": "{url}",')

    print("\nFIXTURE SIZES:")
    for f in sorted(FIXTURES.glob("*.html")):
        size = f.stat().st_size
        status = "OK" if size > 10_000 else "SMALL - may be blocked"
        print(f"  {f.name:40s}  {size:>10,} bytes  {status}")


if __name__ == "__main__":
    asyncio.run(main())
