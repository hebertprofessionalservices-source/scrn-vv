from pathlib import Path

import httpx
import pytest

from scraper.http import StaticFetcher


@pytest.fixture
def transport_ok():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"binary-bytes")
    return httpx.MockTransport(handler)


@pytest.fixture
def transport_429_then_ok():
    state = {"calls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        state["calls"] += 1
        if state["calls"] == 1:
            return httpx.Response(429, headers={"retry-after": "0"})
        return httpx.Response(200, content=b"ok")

    return httpx.MockTransport(handler), state


@pytest.fixture
def transport_404():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)
    return httpx.MockTransport(handler)


async def test_fetch_bytes_succeeds(transport_ok):
    fetcher = StaticFetcher(transport=transport_ok)
    data = await fetcher.fetch_bytes("https://example.com/x.png")
    assert data == b"binary-bytes"
    await fetcher.aclose()


async def test_fetch_bytes_retries_on_429(transport_429_then_ok):
    transport, state = transport_429_then_ok
    fetcher = StaticFetcher(transport=transport, max_attempts=3, base_backoff=0.0)
    data = await fetcher.fetch_bytes("https://example.com/x.png")
    assert data == b"ok"
    assert state["calls"] == 2
    await fetcher.aclose()


async def test_fetch_bytes_returns_none_on_404(transport_404):
    fetcher = StaticFetcher(transport=transport_404)
    assert await fetcher.fetch_bytes("https://example.com/missing.png") is None
    await fetcher.aclose()


async def test_download_writes_file(tmp_path: Path, transport_ok):
    fetcher = StaticFetcher(transport=transport_ok)
    dest = tmp_path / "x.png"
    ok = await fetcher.download("https://example.com/x.png", dest)
    assert ok is True
    assert dest.read_bytes() == b"binary-bytes"
    await fetcher.aclose()
