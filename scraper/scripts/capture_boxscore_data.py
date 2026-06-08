"""Capture boxscore API JSON responses from MaxPreps legacy contest pages.

The boxscore pages are pre-Next.js and load data via XHR/fetch at runtime.
This script intercepts all JSON responses and saves the largest one that
contains box score data.

Usage:
    python scripts/capture_boxscore_data.py
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

TARGETS = [
    (
        "boxscore_complete.json",
        (
            "https://www.maxpreps.com/games/08-29-2025/football-25/"
            "oak-grove-vs-starkville.htm?c=GbcX724Q30WON6REOKFZxQ"
        ),
        "ef17b719-106e-45df-8e37-a44438a159c5",  # contestId
    ),
    (
        "boxscore_missing.json",
        (
            "https://www.maxpreps.com/games/09-11-2026/football-26/"
            "ashland-vs-byhalia.htm?c=vjFO3GAoFkuZvV2CuDaWXg"
        ),
        "dc4e31be-2860-4b16-99bd-5d82b836965e",  # contestId
    ),
]

# Known MaxPreps API patterns for box score data
BOXSCORE_URL_PATTERNS = [
    "api.maxpreps.com",
    "boxscore",
    "contest",
    "stats",
    "scoring",
]


async def capture_boxscore(
    page, url: str, contest_id: str, dest: Path
) -> tuple[bool, int, list[str]]:
    """Capture boxscore JSON data for a contest page."""
    captured_responses: list[tuple[str, bytes]] = []
    all_json_urls: list[str] = []

    async def on_response(resp):
        try:
            u = resp.url
            ct = resp.headers.get("content-type", "")
            if "json" in ct or u.endswith(".json"):
                all_json_urls.append(u)
                # Check if this is a boxscore/contest related URL
                u_lower = u.lower()
                is_relevant = any(pat in u_lower for pat in BOXSCORE_URL_PATTERNS)
                if is_relevant or contest_id.lower() in u_lower:
                    body = await resp.body()
                    if len(body) > 100:
                        captured_responses.append((u, body))
        except Exception:
            pass

    page.on("response", on_response)
    print(f"  Navigating to: {url}")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
    except Exception as exc:
        print(f"  goto warning: {exc}")

    # Wait longer for legacy page with multiple XHR requests
    with contextlib.suppress(Exception):
        await page.wait_for_load_state("networkidle", timeout=20_000)
    await page.wait_for_timeout(5_000)
    page.remove_listener("response", on_response)

    print(f"  All JSON URLs intercepted ({len(all_json_urls)}):")
    for u in all_json_urls[:20]:
        print(f"    {u}")

    if not captured_responses:
        print(f"  No relevant JSON responses captured for contest {contest_id}")
        # Try to save a combined summary of what we got
        if all_json_urls:
            summary = {
                "error": "no_boxscore_data_captured",
                "contest_id": contest_id,
                "page_url": url,
                "json_urls_seen": all_json_urls,
            }
            dest.write_text(json.dumps(summary, indent=2), encoding="utf-8")
            return False, 0, all_json_urls
        return False, 0, all_json_urls

    # Sort by size, take largest
    captured_responses.sort(key=lambda x: len(x[1]), reverse=True)
    print(f"  Relevant responses: {len(captured_responses)}")
    for u, b in captured_responses[:5]:
        print(f"    {len(b):,} bytes  {u}")

    # If we have multiple responses, merge them into a single fixture
    if len(captured_responses) == 1:
        used_url, body = captured_responses[0]
        parsed = json.loads(body)
        dest.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
        return True, len(body), all_json_urls
    else:
        # Bundle all responses
        bundle = {
            "contest_id": contest_id,
            "page_url": url,
            "responses": [
                {"url": u, "data": json.loads(b)}
                for u, b in captured_responses
            ],
        }
        body_str = json.dumps(bundle, indent=2)
        dest.write_text(body_str, encoding="utf-8")
        return True, len(body_str), all_json_urls


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

        for filename, url, contest_id in TARGETS:
            print(f"\n=== {filename} ===")
            page = await context.new_page()
            ok, n, urls = await capture_boxscore(
                page, url, contest_id, FIXTURES / filename
            )
            print(f"  {'OK' if ok else 'FAILED'}: {n:,} bytes written to {filename}")
            await page.close()
            await asyncio.sleep(3)

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
