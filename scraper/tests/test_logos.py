from pathlib import Path

import httpx
import pytest

from scraper.logos import download_team_logo


@pytest.fixture
def transport_png():
    def handler(request):
        return httpx.Response(200, content=b"\x89PNG\r\n\x1a\n-fake-png-bytes")
    return httpx.MockTransport(handler)


@pytest.fixture
def transport_404():
    def handler(request):
        return httpx.Response(404)
    return httpx.MockTransport(handler)


async def test_download_team_logo_writes_file(tmp_path: Path, transport_png):
    out = await download_team_logo(
        team_id="starkville-yellowjackets",
        logo_url="https://cdn.maxpreps.com/logo.png",
        out_dir=tmp_path,
        transport=transport_png,
    )
    assert out is not None
    assert out.name == "starkville-yellowjackets.png"
    assert out.exists()
    assert out.read_bytes().startswith(b"\x89PNG")


async def test_download_skips_when_already_present(tmp_path: Path, transport_png):
    target = tmp_path / "x.png"
    target.write_bytes(b"existing")
    out = await download_team_logo(
        team_id="x",
        logo_url="https://cdn.maxpreps.com/logo.png",
        out_dir=tmp_path,
        transport=transport_png,
    )
    assert out == target
    assert target.read_bytes() == b"existing"


async def test_download_returns_none_when_url_missing(tmp_path: Path, transport_png):
    out = await download_team_logo(
        team_id="x",
        logo_url=None,
        out_dir=tmp_path,
        transport=transport_png,
    )
    assert out is None


async def test_download_returns_none_on_404(tmp_path: Path, transport_404):
    out = await download_team_logo(
        team_id="x",
        logo_url="https://cdn.maxpreps.com/missing.png",
        out_dir=tmp_path,
        transport=transport_404,
    )
    assert out is None
