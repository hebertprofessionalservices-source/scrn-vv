"""Playwright Chromium harness with jitter and one-context discipline."""
from __future__ import annotations

import asyncio
import random
from contextlib import asynccontextmanager
from types import TracebackType

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from scraper import config


class BrowserHarness:
    """Owns the single Chromium context shared across the crawl."""

    def __init__(self, *, headless: bool = True) -> None:
        self._headless = headless
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page_semaphore = asyncio.Semaphore(config.PAGE_CONCURRENCY)

    async def __aenter__(self) -> BrowserHarness:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=self._headless)
        self._context = await self._browser.new_context(
            user_agent=config.USER_AGENT,
            viewport={"width": 1440, "height": 900},
        )
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._context is not None:
            await self._context.close()
        if self._browser is not None:
            await self._browser.close()
        if self._playwright is not None:
            await self._playwright.stop()

    async def new_page(self) -> Page:
        assert self._context is not None, "BrowserHarness not entered"
        return await self._context.new_page()

    @asynccontextmanager
    async def page(self):
        async with self._page_semaphore:
            page = await self.new_page()
            try:
                yield page
            finally:
                await page.close()

    def _jitter_seconds(self) -> float:
        return random.uniform(config.JITTER_MIN_SECONDS, config.JITTER_MAX_SECONDS)

    async def jitter(self) -> None:
        await asyncio.sleep(self._jitter_seconds())
