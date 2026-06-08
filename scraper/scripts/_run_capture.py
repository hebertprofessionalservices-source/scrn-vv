"""Full fixture capture using known MaxPreps URL patterns."""
from __future__ import annotations

import asyncio
import random
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

FIXTURES = PROJECT_ROOT / "tests" / "fixtures"
FIXTURES.mkdir(parents=True, exist_ok=True)

MS_LANDING_URL = "https://www.maxpreps.com/ms/football/"
CLASS_7A_URL = (
    "https://www.maxpreps.com/ms/football/26-27/class/class-7a/"
    "?statedivisionid=86401710-9915-4a02-8f4e-0d905a356dce"
)
CLASS_1A_URL = (
    "https://www.maxpreps.com/ms/football/26-27/class/class-1a/"
    "?statedivisionid=9a6d4194-9862-4164-a3fd-0c401538e687"
)

captured_urls: dict[str, str] = {}


async def jitter() -> None:
    await asyncio.sleep(random.uniform(1.5, 3.5))


async def accept_cookies(page) -> None:
    selectors = [
        'button:has-text("Accept All")',
        'button:has-text("Accept")',
        "[id*=onetrust-accept]",
    ]
    for sel in selectors:
        try:
            await page.click(sel, timeout=2000)
            await page.wait_for_timeout(1000)
            return
        except Exception:
            pass


async def goto(page, url: str) -> None:
    try:
        await page.goto(url, wait_until="networkidle", timeout=60000)
    except Exception:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(5000)
    await accept_cookies(page)


def save(filename: str, html: str, url: str) -> None:
    path = FIXTURES / filename
    path.write_text(html, encoding="utf-8")
    captured_urls[filename] = url
    print(f"  WROTE {filename} ({len(html):,} bytes)")


def team_hrefs(html: str) -> list[str]:
    """Extract team football page hrefs — MaxPreps uses /ms/<city>/<team>/football/ pattern."""
    # Match absolute URLs in href attributes
    abs_links = re.findall(
        r'href="(https://www\.maxpreps\.com/[a-z]{2}/[^"]+/football/)"', html
    )
    # Match relative /state/city/team/football/ links
    rel_links = re.findall(r'href="(/[a-z]{2}/[^"]+/football/)"', html)
    seen: set[str] = set()
    out: list[str] = []
    for link in abs_links + rel_links:
        key = link.rstrip("/")
        if key not in seen:
            seen.add(key)
            out.append(link)
    return out


def game_hrefs(html: str) -> list[str]:
    # MaxPreps game URLs: /games/<state>/<city>/<team>/<sport>/<date>/... or /game/...
    patterns = [
        r'href="(/game[s]?/[^"]+)"',
        r'href="(https://www\.maxpreps\.com/game[s]?/[^"]+)"',
    ]
    seen: set[str] = set()
    out: list[str] = []
    for pat in patterns:
        for link in re.findall(pat, html):
            if link not in seen:
                seen.add(link)
                out.append(link)
    return out


def normalize_team_base(href: str) -> str:
    """Ensure href is an absolute URL ending with /football/."""
    if href.startswith("http"):
        # Strip any extra path after /football/
        m = re.match(r"(https://www\.maxpreps\.com/[a-z]{2}/[^/]+/[^/]+/football/?)", href)
        base = m.group(1) if m else href
    else:
        m = re.match(r"(/[a-z]{2}/[^/]+/[^/]+/football/?)", href)
        base = "https://www.maxpreps.com" + (m.group(1) if m else href)
    return base.rstrip("/") + "/"


async def main() -> None:
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/127.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
        )
        await ctx.add_init_script(
            "delete Object.getPrototypeOf(navigator).webdriver"
        )
        p = await ctx.new_page()

        # 1 — Landing page (already captured earlier; re-save for consistency)
        print("[1/8] Mississippi football landing page...")
        await goto(p, MS_LANDING_URL)
        html = await p.content()
        save("ms_football_landing.html", html, MS_LANDING_URL)
        await jitter()

        # 2 — Class 7A directory
        print("[2/8] Class 7A directory...")
        await goto(p, CLASS_7A_URL)
        html_7a = await p.content()
        save("class_7a_directory.html", html_7a, CLASS_7A_URL)
        teams_7a = team_hrefs(html_7a)
        print(f"  Found {len(teams_7a)} team links: {teams_7a[:3]}")
        starkville = [h for h in teams_7a if "starkville" in h.lower()]
        chosen_href = starkville[0] if starkville else (teams_7a[0] if teams_7a else None)
        print(f"  Chosen team href: {chosen_href}")
        await jitter()

        if not chosen_href:
            print("ERROR: no team found in 7A directory")
            await browser.close()
            return

        team_base = normalize_team_base(chosen_href)
        print(f"  Team base URL: {team_base}")

        # 3 — Team home
        print("[3/8] Team home page...")
        await goto(p, team_base)
        html = await p.content()
        save("team_home.html", html, team_base)
        await jitter()

        # 4 — Roster
        roster_url = team_base + "roster/"
        print(f"[4/8] Roster: {roster_url}")
        await goto(p, roster_url)
        html = await p.content()
        save("team_roster.html", html, roster_url)
        await jitter()

        # 5 — Schedule
        schedule_url = team_base + "schedule/"
        print(f"[5/8] Schedule: {schedule_url}")
        await goto(p, schedule_url)
        schedule_html = await p.content()
        save("team_schedule.html", schedule_html, schedule_url)
        await jitter()

        # 6 — Stats
        stats_url = team_base + "stats/"
        print(f"[6/8] Stats: {stats_url}")
        await goto(p, stats_url)
        html = await p.content()
        save("team_stats.html", html, stats_url)
        await jitter()

        # 7 — Boxscore (complete) — first game link from schedule
        games = game_hrefs(schedule_html)
        print(f"  Game links found: {games[:5]}")
        bs_complete_url: str | None = None
        if games:
            bs_complete_url = "https://www.maxpreps.com" + games[0]
            print(f"[7/8] Boxscore complete: {bs_complete_url}")
            await goto(p, bs_complete_url)
            html = await p.content()
            save("boxscore_complete.html", html, bs_complete_url)
            await jitter()
        else:
            print("[7/8] WARN: no game links found in schedule")

        # 8 — Boxscore (missing / small school) via 1A directory
        print("[8/8] Class 1A for boxscore_missing...")
        await goto(p, CLASS_1A_URL)
        html_1a = await p.content()
        teams_1a = team_hrefs(html_1a)
        print(f"  Found {len(teams_1a)} 1A team links: {teams_1a[:3]}")

        boxscore_missing_url: str | None = None
        if teams_1a:
            team_1a_base = normalize_team_base(teams_1a[0])
            await jitter()
            print(f"  Visiting 1A schedule: {team_1a_base}schedule/")
            await goto(p, team_1a_base + "schedule/")
            sched_1a_html = await p.content()
            games_1a = game_hrefs(sched_1a_html)
            print(f"  1A game links: {games_1a[:5]}")
            if games_1a:
                boxscore_missing_url = "https://www.maxpreps.com" + games_1a[0]
            elif len(games) > 1:
                # fallback: second game from 7A team
                boxscore_missing_url = "https://www.maxpreps.com" + games[1]
                print("  FALLBACK: using second 7A team game as boxscore_missing")

        if boxscore_missing_url:
            await jitter()
            print(f"  Boxscore missing URL: {boxscore_missing_url}")
            await goto(p, boxscore_missing_url)
            html = await p.content()
            save("boxscore_missing.html", html, boxscore_missing_url)
        else:
            print("  WARN: could not capture boxscore_missing.html")

        await browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("CAPTURED URLs (paste into capture_fixtures.py TARGETS):")
    print("=" * 60)
    for fn, url in captured_urls.items():
        print(f'    "{fn}": "{url}",')

    print("\nFIXTURE SIZES:")
    for f in sorted(FIXTURES.glob("*.html")):
        size = f.stat().st_size
        status = "OK" if size > 10000 else "SMALL/BLOCKED"
        print(f"  {f.name:45s} {size:>10,} bytes  {status}")


if __name__ == "__main__":
    asyncio.run(main())
