import os
import shutil

import pytest

from scraper.browser import BrowserHarness


def _chromium_available() -> bool:
    # Browsers installed via `playwright install` live in
    # %USERPROFILE%\AppData\Local\ms-playwright on Windows by default.
    candidate_paths = [
        os.path.expanduser(r"~\AppData\Local\ms-playwright"),
        os.environ.get("PLAYWRIGHT_BROWSERS_PATH", ""),
    ]
    for p in candidate_paths:
        if p and os.path.isdir(p):
            return True
    return bool(shutil.which("chromium"))


@pytest.mark.skipif(not _chromium_available(), reason="Playwright Chromium not installed")
async def test_browser_can_open_about_blank():
    async with BrowserHarness(headless=True) as harness:
        page = await harness.new_page()
        await page.goto("about:blank")
        title = await page.title()
        assert title == ""


async def test_browser_jitter_is_in_range():
    h = BrowserHarness(headless=True)
    for _ in range(50):
        d = h._jitter_seconds()
        assert 1.0 <= d <= 4.0
