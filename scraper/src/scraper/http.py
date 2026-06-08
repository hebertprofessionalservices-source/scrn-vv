"""Async HTTP client for static assets (logos, etc.)."""
from __future__ import annotations

import asyncio
import random
from pathlib import Path

import httpx

from scraper import config


class StaticFetcher:
    """Async fetcher with retry + jitter. For non-JS assets only."""

    def __init__(
        self,
        *,
        transport: httpx.BaseTransport | None = None,
        max_attempts: int = 4,
        base_backoff: float = 1.0,
        timeout: float = config.HTTP_TIMEOUT_SECONDS,
    ) -> None:
        self._client = httpx.AsyncClient(
            transport=transport,
            timeout=timeout,
            headers={"User-Agent": config.USER_AGENT},
            follow_redirects=True,
        )
        self._max_attempts = max_attempts
        self._base_backoff = base_backoff

    async def fetch_bytes(self, url: str) -> bytes | None:
        attempt = 0
        while True:
            attempt += 1
            try:
                resp = await self._client.get(url)
            except httpx.HTTPError:
                if attempt >= self._max_attempts:
                    return None
                await self._sleep_backoff(attempt)
                continue

            if resp.status_code == 200:
                return resp.content
            if resp.status_code in (404, 410):
                return None
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < self._max_attempts:
                await self._sleep_backoff(attempt, hint=resp.headers.get("retry-after"))
                continue
            return None

    async def download(self, url: str, dest: Path) -> bool:
        data = await self.fetch_bytes(url)
        if data is None:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True

    async def _sleep_backoff(self, attempt: int, *, hint: str | None = None) -> None:
        if hint:
            try:
                await asyncio.sleep(min(float(hint), config.MAX_BACKOFF_SECONDS))
                return
            except ValueError:
                pass
        delay = min(self._base_backoff * (2 ** (attempt - 1)), config.MAX_BACKOFF_SECONDS)
        delay += random.uniform(0, self._base_backoff)
        await asyncio.sleep(delay)

    async def aclose(self) -> None:
        await self._client.aclose()
