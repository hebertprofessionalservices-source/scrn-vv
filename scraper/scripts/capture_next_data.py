"""Capture _next/data/*.json fixtures for parser tests.

Intercepts XHR responses from the MaxPreps Next.js app to get structured
page data. The buildId is discovered dynamically from the first page load.

Usage:
    python scripts/capture_next_data.py
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

import contextlib  # noqa: E402

from playwright.async_api import async_playwright  # noqa: E402

FIXTURES = PROJECT_ROOT / "tests" / "fixtures"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/127.0.0.0 Safari/537.36"
)

# (output_filename, page_url, substring that must appear in the _next/data URL)
TARGETS: list[tuple[str, str, str]] = [
    (
        "ms_landing.json",
        "https://www.maxpreps.com/ms/football/",
        "/ms/football",
    ),
    (
        "class_7a_directory.json",
        (
            "https://www.maxpreps.com/ms/football/26-27/class/class-7a/"
            "?statedivisionid=86401710-9915-4a02-8f4e-0d905a356dce"
        ),
        "class-7a",
    ),
    (
        "team_schedule.json",
        (
            "https://www.maxpreps.com/ms/starkville/"
            "starkville-yellowjackets/football/25-26/schedule/"
        ),
        "schedule",
    ),
    (
        "team_stats.json",
        (
            "https://www.maxpreps.com/ms/starkville/"
            "starkville-yellowjackets/football/25-26/stats/"
        ),
        "stats",
    ),
    (
        "boxscore_complete.json",
        (
            "https://www.maxpreps.com/games/08-29-2025/football-25/"
            "oak-grove-vs-starkville.htm?c=GbcX724Q30WON6REOKFZxQ"
        ),
        "/games/",
    ),
    (
        "boxscore_missing.json",
        (
            "https://www.maxpreps.com/games/09-11-2026/football-26/"
            "ashland-vs-byhalia.htm?c=vjFO3GAoFkuZvV2CuDaWXg"
        ),
        "/games/",
    ),
]


async def capture(
    page,
    url: str,
    match_substr: str,
    dest: Path,
) -> tuple[bool, int, str]:
    """Navigate to *url*, intercept the _next/data XHR, save JSON to *dest*.

    Returns (success, byte_count, used_url).
    """
    captured: list[tuple[str, bytes]] = []

    async def on_response(resp):
        try:
            u = resp.url
            if (
                "/_next/data/" in u
                and u.endswith(".json")
                and match_substr in u
            ):
                body = await resp.body()
                captured.append((u, body))
        except Exception:
            pass

    page.on("response", on_response)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
    except Exception as exc:
        print(f"  goto warning: {exc}")
    # Wait for XHRs to settle
    with contextlib.suppress(Exception):
        await page.wait_for_load_state("networkidle", timeout=15_000)
    await page.wait_for_timeout(3_000)
    page.remove_listener("response", on_response)

    if not captured:
        # Fallback: try to extract __NEXT_DATA__ embedded in page HTML
        try:
            html = await page.content()
            import re
            m = re.search(
                r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
                html,
                re.DOTALL,
            )
            if m:
                parsed = json.loads(m.group(1))
                dest.write_text(
                    json.dumps(parsed, indent=2), encoding="utf-8"
                )
                body_bytes = m.group(1).encode()
                return True, len(body_bytes), url + " (embedded __NEXT_DATA__)"
        except Exception:
            pass
        return False, 0, ""

    # Take the largest response body if multiple matched
    captured.sort(key=lambda x: len(x[1]), reverse=True)
    used_url, body = captured[0]
    parsed = json.loads(body)
    dest.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
    return True, len(body), used_url


async def main() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        context = await browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1440, "height": 900},
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        for filename, url, match in TARGETS:
            print(f"\nCapturing {filename}")
            print(f"  URL: {url}")
            page = await context.new_page()
            ok, n, used = await capture(page, url, match, FIXTURES / filename)
            status = "OK " if ok else "NO "
            print(f"  {status} {filename:35s}  {n:>9,} bytes")
            if used and used != url:
                print(f"     source: {used}")
            await page.close()
            # Polite jitter between requests
            await asyncio.sleep(3)

        await browser.close()

    print("\n=== Summary ===")
    for filename, _url, _match in TARGETS:
        p = FIXTURES / filename
        if p.exists():
            size = p.stat().st_size
            try:
                d = json.loads(p.read_text(encoding="utf-8"))
                inner = d.get("pageProps", d.get("props", {}).get("pageProps", {}))
                pp_keys = list(inner.keys())[:6]
                print(f"  OK  {filename:35s} {size:>9,} bytes  keys={pp_keys}")
            except Exception as exc:
                print(f"  ERR {filename:35s} parse error: {exc}")
        else:
            print(f"  MISSING {filename}")


if __name__ == "__main__":
    asyncio.run(main())
